const cheerio = require('cheerio');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs').promises;
const path = require('path');
const { createTask, getUserByEmail, getAllUsers } = require('../database');
const { v4: uuidv4 } = require('uuid');

// URLs da Receita Federal para consulta
const RFB_URLS = {
  calendarioFiscal: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/calendarios',
  obrigacoesAcessorias: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/obrigacoes-acessorias',
  prazos: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/prazos'
};

// Cache para evitar requests desnecessários
let cacheAgendaTributaria = null;
let cacheExpiry = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Busca informações da agenda tributária diretamente do site da Receita Federal
 */
async function buscarAgendaTributariaRFB() {
  console.log('🔍 Buscando informações atualizadas da Receita Federal...');
  
  try {
    // Verificar cache
    if (cacheAgendaTributaria && cacheExpiry && Date.now() < cacheExpiry) {
      console.log('📋 Usando informações em cache');
      return cacheAgendaTributaria;
    }

    const agendaCompleta = {};
    
    // Headers para parecer um navegador real
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
    
    // Buscar calendário fiscal
    console.log('📅 Acessando página de calendários...');
    try {
      const response = await axios.get(RFB_URLS.calendarioFiscal, {
        headers,
        timeout: 30000,
        maxRedirects: 5
      });
      
      const $ = cheerio.load(response.data);
      
      // Buscar por tabelas de prazos
      $('table, .tabela, .calendario').each((index, element) => {
        const tabela = $(element);
        
        // Processar linhas da tabela
        tabela.find('tr').each((i, row) => {
          const colunas = $(row).find('td, th');
          
          if (colunas.length >= 3) {
            const obrigacao = colunas.eq(0).text().trim();
            const prazo = colunas.eq(1).text().trim();
            const observacoes = colunas.eq(2).text().trim();
            
            if (obrigacao && prazo && obrigacao.length > 5) {
              const mesMatch = prazo.match(/(\d+)\/(\d+)/);
              
              if (mesMatch) {
                const dia = parseInt(mesMatch[1]);
                const mes = parseInt(mesMatch[2]);
                
                if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
                  if (!agendaCompleta[mes]) {
                    agendaCompleta[mes] = [];
                  }
                  
                  agendaCompleta[mes].push({
                    titulo: obrigacao,
                    vencimento: dia,
                    observacoes: observacoes || 'Conforme legislação vigente.',
                    fonte: 'Receita Federal do Brasil',
                    dataAtualizacao: new Date().toISOString()
                  });
                }
              }
            }
          }
        });
      });
      
    } catch (error) {
      console.warn('⚠️ Erro ao acessar calendário fiscal:', error.message);
    }

    // Buscar obrigações acessórias
    console.log('📋 Acessando página de obrigações acessórias...');
    try {
      const response2 = await axios.get(RFB_URLS.obrigacoesAcessorias, {
        headers,
        timeout: 30000,
        maxRedirects: 5
      });
      
      const $ = cheerio.load(response2.data);
      
      // Buscar informações adicionais
      $('.conteudo, .texto, .informacoes').each((index, element) => {
        const texto = $(element).text();
        
        // Buscar por datas e obrigações no texto
        const matches = texto.match(/(\w+(?:\s+\w+)*)\s*[-:]\s*(\d{1,2})\/(\d{1,2})/g);
        
        if (matches) {
          matches.forEach(match => {
            const parts = match.match(/(.+?)\s*[-:]\s*(\d{1,2})\/(\d{1,2})/);
            if (parts) {
              const obrigacao = parts[1].trim();
              const dia = parseInt(parts[2]);
              const mes = parseInt(parts[3]);
              
              if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31 && obrigacao.length > 3) {
                if (!agendaCompleta[mes]) {
                  agendaCompleta[mes] = [];
                }
                
                // Evitar duplicatas
                const existe = agendaCompleta[mes].some(item => 
                  item.titulo.toLowerCase().includes(obrigacao.toLowerCase().substring(0, 10))
                );
                
                if (!existe) {
                  agendaCompleta[mes].push({
                    titulo: obrigacao,
                    vencimento: dia,
                    observacoes: 'Conforme orientações da Receita Federal.',
                    fonte: 'Receita Federal do Brasil',
                    dataAtualizacao: new Date().toISOString()
                  });
                }
              }
            }
          });
        }
      });
      
    } catch (error) {
      console.warn('⚠️ Erro ao acessar obrigações acessórias:', error.message);
    }

    // Se não conseguiu buscar dados online, usar dados de fallback
    if (Object.keys(agendaCompleta).length === 0) {
      console.warn('⚠️ Não foi possível buscar dados atualizados. Usando dados de fallback...');
      agendaCompleta = await obterDadosFallback();
    }
    
    // Salvar cache
    cacheAgendaTributaria = agendaCompleta;
    cacheExpiry = Date.now() + CACHE_DURATION;
    
    // Salvar em arquivo para backup
    await salvarBackupLocal(agendaCompleta);
    
    console.log(`✅ Agenda tributária atualizada! ${Object.keys(agendaCompleta).length} meses processados.`);
    
    return agendaCompleta;
    
  } catch (error) {
    console.error('❌ Erro ao buscar agenda tributária:', error.message);
    
    // Tentar carregar backup local
    const backup = await carregarBackupLocal();
    if (backup) {
      console.log('📋 Usando backup local da agenda tributária');
      return backup;
    }
    
    // Último recurso: dados estáticos
    console.log('📋 Usando dados estáticos como último recurso');
    return await obterDadosFallback();
  }
}

/**
 * Salva backup local da agenda tributária
 */
async function salvarBackupLocal(agenda) {
  try {
    const backupPath = path.join(__dirname, 'backup-agenda-tributaria.json');
    const dados = {
      agenda,
      dataAtualizacao: new Date().toISOString(),
      fonte: 'Receita Federal do Brasil'
    };
    
    await fs.writeFile(backupPath, JSON.stringify(dados, null, 2), 'utf8');
    console.log('💾 Backup local salvo com sucesso');
  } catch (error) {
    console.warn('⚠️ Erro ao salvar backup local:', error.message);
  }
}

/**
 * Carrega backup local da agenda tributária
 */
async function carregarBackupLocal() {
  try {
    const backupPath = path.join(__dirname, 'backup-agenda-tributaria.json');
    const dados = await fs.readFile(backupPath, 'utf8');
    const backup = JSON.parse(dados);
    
    // Verificar se o backup não está muito antigo (máximo 7 dias)
    const dataBackup = new Date(backup.dataAtualizacao);
    const agora = new Date();
    const diasDiferenca = (agora - dataBackup) / (1000 * 60 * 60 * 24);
    
    if (diasDiferenca <= 7) {
      return backup.agenda;
    } else {
      console.log('📋 Backup local está desatualizado');
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Dados de fallback baseados na legislação atual
 */
async function obterDadosFallback() {
  return {
    1: [ // Janeiro
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC.",
        fonte: "Legislação vigente"
      },
      {
        titulo: "DIRF - Declaração do Imposto de Renda Retido na Fonte",
        vencimento: 31,
        observacoes: "Declaração anual referente ao ano anterior. Transmitir via PGD no e-CAC.",
        fonte: "Legislação vigente"
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior.",
        fonte: "Legislação vigente"
      }
    ],
    // Adicionar outros meses conforme necessário...
  };
}

/**
 * Busca dados de uma API alternativa (BrasilAPI ou similar)
 */
async function buscarDadosAPIAlternativa() {
  try {
    console.log('🔄 Tentando APIs alternativas...');
    
    // BrasilAPI não tem agenda tributária, mas podemos buscar outras fontes
    const response = await axios.get('https://brasilapi.com.br/api/feriados/v1/2024', {
      timeout: 10000
    });
    
    const feriados = response.data;
    
    // Processar feriados para ajustar datas de vencimento
    const feriadosMap = {};
    feriados.forEach(feriado => {
      const data = new Date(feriado.date);
      const chave = `${data.getMonth() + 1}-${data.getDate()}`;
      feriadosMap[chave] = feriado.name;
    });
    
    console.log(`✅ Encontrados ${Object.keys(feriadosMap).length} feriados nacionais`);
    return { feriados: feriadosMap };
    
  } catch (error) {
    console.warn('⚠️ Erro ao buscar dados de APIs alternativas:', error.message);
    return null;
  }
}

/**
 * Atualiza a agenda tributária com dados da Receita Federal
 */
async function atualizarAgendaTributaria() {
  try {
    console.log('🚀 Iniciando atualização da agenda tributária...');
    
    // Buscar dados atualizados
    const agendaAtualizada = await buscarAgendaTributariaRFB();
    
    // Buscar feriados para ajuste de datas
    const dadosAdicionais = await buscarDadosAPIAlternativa();
    
    console.log('✅ Atualização concluída com sucesso!');
    
    return {
      agenda: agendaAtualizada,
      feriados: dadosAdicionais?.feriados || {},
      dataAtualizacao: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro na atualização:', error.message);
    throw error;
  }
}

/**
 * Cria tarefas usando dados atualizados da Receita Federal
 */
async function criarTarefasComDadosAtualizados(ano, mes, responsavelEmail = null) {
  try {
    console.log(`\n=== Criando tarefas com dados atualizados - ${mes}/${ano} ===`);
    
    // Atualizar dados
    const dadosAtualizados = await atualizarAgendaTributaria();
    
    // Buscar responsável
    let responsavel;
    if (responsavelEmail) {
      responsavel = await getUserByEmail(responsavelEmail);
      if (!responsavel) {
        console.log(`❌ Email ${responsavelEmail} não encontrado. Buscando administrador...`);
        responsavel = null;
      }
    }
    
    if (!responsavel) {
      const users = await getAllUsers();
      responsavel = users.find(user => user.cargo === 'admin');
      
      if (!responsavel) {
        throw new Error('Nenhum usuário administrador encontrado no sistema');
      }
    }
    
    console.log(`✅ Responsável definido: ${responsavel.nome_completo} (${responsavel.email})`);
    
    // Buscar obrigações do mês
    const obrigacoesMes = dadosAtualizados.agenda[mes];
    if (!obrigacoesMes || obrigacoesMes.length === 0) {
      console.warn(`⚠️ Nenhuma obrigação encontrada para o mês ${mes}`);
      return {
        sucesso: false,
        erro: `Nenhuma obrigação encontrada para o mês ${mes}`
      };
    }
    
    const tarefasCriadas = [];
    
    // Criar tarefa para cada obrigação
    for (const obrigacao of obrigacoesMes) {
      let dataVencimento = new Date(ano, mes - 1, obrigacao.vencimento);
      
      // Ajustar para dia útil considerando feriados
      dataVencimento = ajustarDiaUtilComFeriados(dataVencimento, dadosAtualizados.feriados);
      
      const taskData = {
        id: uuidv4(),
        titulo: obrigacao.titulo,
        responsavel: responsavel.nome_completo,
        responsavelId: responsavel.uid,
        dataVencimento: dataVencimento.toISOString(),
        observacoes: obrigacao.observacoes + 
                    `\n\n📅 Vencimento original: ${obrigacao.vencimento}/${mes}/${ano}` +
                    (obrigacao.fonte ? `\n🔍 Fonte: ${obrigacao.fonte}` : '') +
                    `\n📊 Dados atualizados em: ${new Date(dadosAtualizados.dataAtualizacao).toLocaleDateString('pt-BR')}`,
        recorrente: true,
        frequencia: 'mensal'
      };
      
      try {
        await createTask(taskData);
        tarefasCriadas.push(taskData);
        console.log(`✅ ${obrigacao.titulo} - Vencimento: ${dataVencimento.toLocaleDateString('pt-BR')}`);
      } catch (error) {
        console.error(`❌ Erro ao criar tarefa "${obrigacao.titulo}": ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Concluído! ${tarefasCriadas.length} tarefas criadas para ${mes}/${ano}`);
    console.log(`📧 Responsável: ${responsavel.nome_completo} (${responsavel.email})`);
    console.log(`🔄 Dados atualizados da Receita Federal`);
    
    return {
      sucesso: true,
      mes,
      ano,
      responsavel: responsavel.nome_completo,
      tarefasCriadas: tarefasCriadas.length,
      tarefas: tarefasCriadas,
      fonteDados: 'Receita Federal do Brasil (atualizado)'
    };
    
  } catch (error) {
    console.error(`❌ Erro ao criar tarefas atualizadas para ${mes}/${ano}:`, error.message);
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

/**
 * Ajusta data para dia útil considerando fins de semana e feriados
 */
function ajustarDiaUtilComFeriados(data, feriados = {}) {
  let dataAjustada = new Date(data);
  let tentativas = 0;
  const maxTentativas = 10;
  
  while (tentativas < maxTentativas) {
    const diaSemana = dataAjustada.getDay();
    const chave = `${dataAjustada.getMonth() + 1}-${dataAjustada.getDate()}`;
    
    // Verificar se é fim de semana ou feriado
    if (diaSemana === 0 || diaSemana === 6 || feriados[chave]) {
      dataAjustada.setDate(dataAjustada.getDate() + 1);
      tentativas++;
    } else {
      break;
    }
  }
  
  return dataAjustada;
}

/**
 * Função principal para execução via linha de comando
 */
async function main() {
  const args = process.argv.slice(2);
  const comando = args[0];
  
  if (!comando) {
    console.log(`
🏛️  AGENDA TRIBUTÁRIA ATUALIZADA (RECEITA FEDERAL)
===============================================

Este script busca informações atualizadas diretamente da Receita Federal.

Uso:
  node agenda-tributaria-scraper.js atualizar
  node agenda-tributaria-scraper.js criar-mes <ano> <mes> [email_responsavel]
  node agenda-tributaria-scraper.js testar-conexao
  node agenda-tributaria-scraper.js limpar-cache

Exemplos:
  node agenda-tributaria-scraper.js atualizar                    # Atualizar dados da RFB
  node agenda-tributaria-scraper.js criar-mes 2024 3             # Criar tarefas mar/2024
  node agenda-tributaria-scraper.js criar-mes 2024 3 admin@empresa.com
  node agenda-tributaria-scraper.js testar-conexao               # Testar acesso à RFB
    `);
    return;
  }
  
  try {
    switch (comando.toLowerCase()) {
      case 'atualizar':
        console.log('🔄 Atualizando dados da Receita Federal...');
        const dados = await atualizarAgendaTributaria();
        console.log('\n✅ Atualização concluída!');
        console.log(`📊 Meses com dados: ${Object.keys(dados.agenda).length}`);
        console.log(`🗓️ Feriados carregados: ${Object.keys(dados.feriados).length}`);
        break;
        
      case 'criar-mes':
        const ano = parseInt(args[1]);
        const mes = parseInt(args[2]);
        const email = args[3] || null;
        
        if (!ano || !mes || mes < 1 || mes > 12) {
          console.error('❌ Ano e mês são obrigatórios. Mês deve estar entre 1 e 12.');
          return;
        }
        
        await criarTarefasComDadosAtualizados(ano, mes, email);
        break;
        
      case 'testar-conexao':
        console.log('🔍 Testando conexão com a Receita Federal...');
        
        try {
          const response = await axios.get(RFB_URLS.calendarioFiscal, { timeout: 10000 });
          if (response.status === 200) {
            console.log('✅ Conexão com RFB: OK');
          }
        } catch (error) {
          console.log('❌ Conexão com RFB: FALHOU');
          console.log(`   Erro: ${error.message}`);
        }
        
        try {
          const response = await axios.get('https://brasilapi.com.br/api/feriados/v1/2024', { timeout: 5000 });
          if (response.status === 200) {
            console.log('✅ Conexão com BrasilAPI: OK');
          }
        } catch (error) {
          console.log('❌ Conexão com BrasilAPI: FALHOU');
        }
        break;
        
      case 'limpar-cache':
        cacheAgendaTributaria = null;
        cacheExpiry = null;
        console.log('🗑️ Cache limpo com sucesso!');
        break;
        
      default:
        console.error(`❌ Comando "${comando}" não reconhecido.`);
    }
    
  } catch (error) {
    console.error('❌ Erro na execução:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().then(() => {
    console.log('\n✨ Execução finalizada!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  });
}

module.exports = {
  buscarAgendaTributariaRFB,
  atualizarAgendaTributaria,
  criarTarefasComDadosAtualizados
};
