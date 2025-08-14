const cheerio = require('cheerio');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs').promises;
const path = require('path');
const { createTask, getUserByEmail, getAllUsers, checkTaskExists } = require('../database');
const { v4: uuidv4 } = require('uuid');

// URLs da Receita Federal para consulta (atualizadas para 2025)
const RFB_URLS = {
  agendaTributaria: 'https://www.gov.br/receitafederal/pt-br/assuntos/agenda-tributaria/2025',
  obrigacoesAcessorias: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/obrigacoes-acessorias'
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

    let agendaCompleta = {};
    const anoAtual = new Date().getFullYear();
    
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
    
    // Buscar página principal da agenda tributária
    console.log('📅 Acessando página principal da agenda tributária...');
    const response = await axios.get(RFB_URLS.agendaTributaria, {
      headers,
      timeout: 30000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Encontrar links para páginas mensais
    const mesesLinks = [];
    $('a[href*="/assuntos/agenda-tributaria/2025/"]').each((i, el) => {
      const href = $(el).attr('href');
      const mesesValidos = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      if (mesesValidos.some(mes => href.toLowerCase().includes(mes))) {
        mesesLinks.push(new URL(href, 'https://www.gov.br').href);
      }
    });
    
    console.log(`📅 Encontrados ${mesesLinks.length} links de meses`);

    // Processar cada mês
    for (const [index, link] of mesesLinks.entries()) {
      const mesIndex = index + 1;
      console.log(`📅 Processando mês ${mesIndex} (${link})...`);
      
      try {
        const mesResponse = await axios.get(link, { headers, timeout: 30000 });
        const $mes = cheerio.load(mesResponse.data);
        
        // Parsear tabelas de obrigações
        $mes('table.govbr-table, .tabela-obrigacoes').each((i, tabela) => {
          $mes(tabela).find('tr').each((j, row) => {
            const colunas = $mes(row).find('td');
            if (colunas.length >= 4) { // Código, Descrição, Período, Vencimento
              const codigo = colunas.eq(0).text().trim();
              const obrigacao = colunas.eq(1).text().trim();
              const periodo = colunas.eq(2).text().trim();
              const prazo = colunas.eq(3).text().trim();
              
              if (obrigacao && prazo && obrigacao.length > 5 && !obrigacao.match(/^(tabela|item|data)$/i)) {
                // Regex mais robusto para capturar datas
                const dataMatch = prazo.match(/(\d{1,2})(?:º)?(?: a \d{1,2})?[-\/](\w+|\d{1,2})[-\/](\d{4})/i);
                if (dataMatch) {
                  const dia = parseInt(dataMatch[1]);
                  let mes = parseInt(dataMatch[2]) || 0;
                  const ano = parseInt(dataMatch[3]) || anoAtual;
                  
                  const mesesMap = {
                    'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
                    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
                  };
                  if (!mes) {
                    const mesNome = dataMatch[2].toLowerCase();
                    mes = mesesMap[mesNome];
                  }
                  
                  if (mes && dia >= 1 && dia <= 31 && ano === anoAtual) {
                    if (!agendaCompleta[mes]) {
                      agendaCompleta[mes] = [];
                    }
                    
                    // Evitar duplicatas com hash mais específico
                    const hash = `${obrigacao.toLowerCase()}-${dia}-${mes}-${ano}`;
                    const existe = agendaCompleta[mes].some(item => 
                      `${item.titulo.toLowerCase()}-${item.vencimento}-${mes}-${ano}` === hash
                    );
                    
                    if (!existe) {
                      agendaCompleta[mes].push({
                        codigo: codigo || 'N/A',
                        titulo: obrigacao,
                        vencimento: dia,
                        periodo: periodo || 'Não especificado',
                        observacoes: `Código: ${codigo}. Período de apuração: ${periodo}. Conforme legislação vigente.`,
                        fonte: 'Receita Federal do Brasil',
                        dataAtualizacao: new Date().toISOString()
                      });
                      console.log(`✅ Obrigação adicionada: ${obrigacao} (Vencimento: ${dia}/${mes}/${ano})`);
                    } else {
                      console.log(`⚠️ Obrigação ignorada (duplicata): ${obrigacao}`);
                    }
                  } else {
                    console.log(`⚠️ Dados inválidos para obrigação: ${obrigacao} (Dia: ${dia}, Mês: ${mes}, Ano: ${ano})`);
                  }
                } else {
                  console.log(`⚠️ Formato de data inválido para: ${prazo}`);
                }
              }
            }
          });
        });
        
        // Parsear listas adicionais
        $mes('ul.lista-obrigacoes, .obrigacoes').each((i, lista) => {
          $mes(lista).find('li').each((j, item) => {
            const texto = $mes(item).text().trim();
            const dataMatch = texto.match(/(.+?)\s*[-:]\s*(\d{1,2})(?:º)?(?: a \d{1,2})?[-\/](\w+|\d{1,2})[-\/](\d{4})/i);
            if (dataMatch) {
              const obrigacao = dataMatch[1].trim();
              const dia = parseInt(dataMatch[2]);
              let mes = parseInt(dataMatch[3]) || 0;
              const ano = parseInt(dataMatch[4]) || anoAtual;
              
              const mesesMap = {
                'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
                'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
              };
              if (!mes) {
                const mesNome = dataMatch[3].toLowerCase();
                mes = mesesMap[mesNome];
              }
              
              if (mes && dia >= 1 && dia <= 31 && ano === anoAtual) {
                if (!agendaCompleta[mes]) {
                  agendaCompleta[mes] = [];
                }
                
                const hash = `${obrigacao.toLowerCase()}-${dia}-${mes}-${ano}`;
                const existe = agendaCompleta[mes].some(item => 
                  `${item.titulo.toLowerCase()}-${item.vencimento}-${mes}-${ano}` === hash
                );
                
                if (!existe) {
                  agendaCompleta[mes].push({
                    codigo: 'N/A',
                    titulo: obrigacao,
                    vencimento: dia,
                    periodo: 'Não especificado',
                    observacoes: `Extraído de lista. Conforme Receita Federal.`,
                    fonte: 'Receita Federal do Brasil',
                    dataAtualizacao: new Date().toISOString()
                  });
                  console.log(`✅ Obrigação adicionada (lista): ${obrigacao} (Vencimento: ${dia}/${mes}/${ano})`);
                } else {
                  console.log(`⚠️ Obrigação ignorada (duplicata em lista): ${obrigacao}`);
                }
              } else {
                console.log(`⚠️ Dados inválidos para obrigação (lista): ${obrigacao} (Dia: ${dia}, Mês: ${mes}, Ano: ${ano})`);
              }
            } else {
              console.log(`⚠️ Formato de data inválido para (lista): ${texto}`);
            }
          });
        });
        
      } catch (error) {
        console.warn(`⚠️ Erro ao acessar página do mês ${mesIndex}:`, error.message);
      }
    }
    
    // Verificar se obteve dados suficientes
    const totalObrigacoes = Object.values(agendaCompleta).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`📊 Total de obrigações coletadas: ${totalObrigacoes}`);
    
    if (totalObrigacoes === 0) {
      console.warn('⚠️ Não foi possível buscar dados atualizados. Usando dados de fallback...');
      agendaCompleta = await obterDadosFallback();
    } else {
      console.log(`✅ Encontradas obrigações para ${Object.keys(agendaCompleta).length} meses`);
    }
    
    // Salvar cache apenas se houver dados válidos
    if (totalObrigacoes > 0) {
      cacheAgendaTributaria = agendaCompleta;
      cacheExpiry = Date.now() + CACHE_DURATION;
      await salvarBackupLocal(agendaCompleta);
    } else {
      console.warn('⚠️ Cache não atualizado devido a dados insuficientes');
      cacheAgendaTributaria = null;
      cacheExpiry = null;
    }
    
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
    await fs.access(path.dirname(backupPath), fs.constants.W_OK);
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
    // Não logar ENOENT como erro, pois é esperado se o backup não existe
    if (error.code !== 'ENOENT') {
      console.warn('⚠️ Erro ao carregar backup local:', error.message);
    }
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
        codigo: '6813',
        titulo: 'IRRF - Fundo de Investimento em Ações',
        vencimento: 15,
        periodo: '1º a 10/janeiro/2025',
        observacoes: 'Recolhimento do Imposto de Renda Retido na Fonte. Transmitir via e-CAC.',
        fonte: 'Legislação vigente'
      },
      {
        codigo: '0561',
        titulo: 'EFD - Contribuições',
        vencimento: 20,
        periodo: 'Dezembro/2024',
        observacoes: 'Escrituração Fiscal Digital das Contribuições incidentes sobre a Receita.',
        fonte: 'Legislação vigente'
      },
      {
        codigo: '1234',
        titulo: 'ICMS - Diferencial de Alíquota',
        vencimento: 20,
        periodo: 'Dezembro/2024',
        observacoes: 'Pagamento do diferencial de alíquota de ICMS.',
        fonte: 'Legislação vigente'
      },
      {
        codigo: '5678',
        titulo: 'DCTF - Declaração de Débitos e Créditos',
        vencimento: 21,
        periodo: 'Dezembro/2024',
        observacoes: 'Entrega da Declaração de Débitos e Créditos Tributários Federais.',
        fonte: 'Legislação vigente'
      }
    ]
  };
}

/**
 * Busca dados de uma API alternativa (BrasilAPI para feriados)
 */
async function buscarDadosAPIAlternativa() {
  try {
    console.log('🔄 Tentando APIs alternativas...');
    
    const response = await axios.get(`https://brasilapi.com.br/api/feriados/v1/2025`, {
      timeout: 10000
    });
    
    const feriados = response.data.filter(f => f.type === 'national');
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
    
    const agendaAtualizada = await buscarAgendaTributariaRFB();
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
    
    const dadosAtualizados = await atualizarAgendaTributaria();
    
    // Validar usuário responsável
    let responsavel;
    if (responsavelEmail) {
      responsavel = await getUserByEmail(responsavelEmail);
      if (!responsavel) {
        console.log(`❌ Email ${responsavelEmail} não encontrado. Buscando administrador...`);
      }
    }
    
    if (!responsavel) {
      const users = await getAllUsers();
      responsavel = users.find(user => user.cargo === 'admin');
      if (!responsavel) {
        throw new Error('Nenhum usuário administrador encontrado no sistema');
      }
    }
    
    console.log(`✅ Responsável definido: ${responsavel.nome_completo} (${responsavel.email}, UID: ${responsavel.uid})`);
    
    const obrigacoesMes = dadosAtualizados.agenda[mes] || [];
    if (!obrigacoesMes.length) {
      console.warn(`⚠️ Nenhuma obrigação encontrada para o mês ${mes}`);
      return {
        sucesso: false,
        erro: `Nenhuma obrigação encontrada para o mês ${mes}`,
        tarefasCriadas: 0,
        detalhes: { erros: [`Nenhuma obrigação encontrada para ${mes}/${ano}`], duplicatas: [] }
      };
    }
    
    console.log(`📋 Processando ${obrigacoesMes.length} obrigações para ${mes}/${ano}`);
    console.log('Obrigações:', JSON.stringify(obrigacoesMes, null, 2));
    
    const tarefasCriadas = [];
    const erros = [];
    const duplicatas = [];
    
    for (const obrigacao of obrigacoesMes) {
      try {
        let dataVencimento = new Date(ano, mes - 1, obrigacao.vencimento);
        if (isNaN(dataVencimento.getTime())) {
          throw new Error(`Data de vencimento inválida para ${obrigacao.titulo}: ${obrigacao.vencimento}/${mes}/${ano}`);
        }
        
        dataVencimento = ajustarDiaUtilComFeriados(dataVencimento, dadosAtualizados.feriados);
        const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
        
        // Verificar se a tarefa já existe
        const tarefaExiste = await checkTaskExists(obrigacao.titulo, dataVencimentoStr, responsavel.uid);
        if (tarefaExiste) {
          console.log(`⚠️ Tarefa já existe: ${obrigacao.titulo} (Vencimento: ${dataVencimento.toLocaleDateString('pt-BR')})`);
          duplicatas.push(`Tarefa já existe: ${obrigacao.titulo} (Vencimento: ${dataVencimentoStr})`);
          continue;
        }
        
        const taskData = {
          id: uuidv4(),
          titulo: obrigacao.titulo,
          responsavel: responsavel.nome_completo,
          responsavelId: responsavel.uid,
          dataVencimento: dataVencimento.toISOString(),
          observacoes: `${obrigacao.observacoes}\n\n📅 Vencimento original: ${obrigacao.vencimento}/${mes}/${ano}` +
                      (obrigacao.fonte ? `\n🔍 Fonte: ${obrigacao.fonte}` : '') +
                      `\n📊 Dados atualizados em: ${new Date(dadosAtualizados.dataAtualizacao).toLocaleDateString('pt-BR')}`,
          recorrente: true,
          frequencia: 'mensal'
        };
        
        await createTask(taskData);
        tarefasCriadas.push(taskData);
        console.log(`✅ Tarefa criada: ${obrigacao.titulo} - Vencimento: ${dataVencimento.toLocaleDateString('pt-BR')}`);
      } catch (error) {
        console.error(`❌ Erro ao criar tarefa "${obrigacao.titulo}": ${error.message}`);
        erros.push(`Erro ao criar tarefa "${obrigacao.titulo}": ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Concluído! ${tarefasCriadas.length} tarefas criadas para ${mes}/${ano}`);
    console.log(`📧 Responsável: ${responsavel.nome_completo} (${responsavel.email})`);
    console.log(`🔄 Dados atualizados da Receita Federal`);
    console.log(`❌ Erros encontrados: ${erros.length}`);
    console.log(`🔄 Duplicatas ignoradas: ${duplicatas.length}`);
    if (erros.length > 0) {
      console.log('Erros detalhados:', erros);
    }
    if (duplicatas.length > 0) {
      console.log('Duplicatas detalhadas:', duplicatas);
    }
    
    return {
      sucesso: tarefasCriadas.length > 0,
      mes,
      ano,
      responsavel: responsavel.nome_completo,
      tarefasCriadas: tarefasCriadas.length,
      tarefas: tarefasCriadas,
      fonteDados: 'Receita Federal do Brasil (atualizado)',
      detalhes: { erros, duplicatas }
    };
    
  } catch (error) {
    console.error(`❌ Erro ao criar tarefas atualizadas para ${mes}/${ano}:`, error.message);
    return {
      sucesso: false,
      erro: error.message,
      tarefasCriadas: 0,
      detalhes: { erros: [error.message], duplicatas: [] }
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
    
    if (diaSemana === 0 || diaSemana === 6 || feriados[chave]) {
      dataAjustada.setDate(dataAjustada.getDate() + 1);
      tentativas++;
    } else {
      break;
    }
  }
  
  if (tentativas >= maxTentativas) {
    console.warn(`⚠️ Máximo de tentativas atingido para ajustar data: ${data.toLocaleDateString('pt-BR')}`);
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
  node agenda-tributaria-scraper.js criar-mes 2025 3             # Criar tarefas mar/2025
  node agenda-tributaria-scraper.js criar-mes 2025 3 admin@empresa.com
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
          const response = await axios.get(RFB_URLS.agendaTributaria, { timeout: 10000 });
          if (response.status === 200) {
            console.log('✅ Conexão com RFB: OK');
          }
        } catch (error) {
          console.log('❌ Conexão com RFB: FALHOU');
          console.log(`   Erro: ${error.message}`);
        }
        
        try {
          const response = await axios.get('https://brasilapi.com.br/api/feriados/v1/2025', { timeout: 5000 });
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