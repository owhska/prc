const { createTask, getUserByEmail, getAllUsers } = require('../database');
const { v4: uuidv4 } = require('uuid');

// Agenda Tributária - Obrigações mensais do Brasil
const OBRIGACOES_TRIBUTARIAS = [
  // JANEIRO
  {
    mes: 1,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "DIRF - Declaração do Imposto de Renda Retido na Fonte",
        vencimento: 31,
        observacoes: "Declaração anual referente ao ano anterior. Transmitir via PGD no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 31,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      }
    ]
  },
  // FEVEREIRO
  {
    mes: 2,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 28, // ou 29 em ano bissexto
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "RAIS - Relação Anual de Informações Sociais",
        vencimento: 28, // ou 29 em ano bissexto
        observacoes: "Declaração anual referente ao exercício anterior. Transmitir via GDRAIS."
      }
    ]
  },
  // MARÇO
  {
    mes: 3,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 31,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "ECF - Escrituração Contábil Fiscal",
        vencimento: 31,
        observacoes: "Declaração anual referente ao exercício anterior. Transmitir via PGD no e-CAC."
      }
    ]
  },
  // ABRIL
  {
    mes: 4,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 30,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "ECD - Escrituração Contábil Digital",
        vencimento: 30,
        observacoes: "Declaração anual referente ao exercício anterior. Transmitir via PVA ECD."
      }
    ]
  },
  // MAIO
  {
    mes: 5,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 31,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "DIPJ - Declaração de Informações Econômico-Fiscais da Pessoa Jurídica",
        vencimento: 31,
        observacoes: "Declaração anual referente ao exercício anterior. Transmitir via PGD no e-CAC."
      }
    ]
  },
  // JUNHO
  {
    mes: 6,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 30,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "DEFIS - Declaração de Informações Socioeconômicas e Fiscais",
        vencimento: 30,
        observacoes: "Para MEI - Microempreendedor Individual. Transmitir via Portal do Empreendedor."
      }
    ]
  },
  // JULHO
  {
    mes: 7,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 31,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "EFD-Contribuições - Escrituração Fiscal Digital",
        vencimento: 15,
        observacoes: "Escrituração das contribuições PIS/COFINS do mês anterior."
      }
    ]
  },
  // AGOSTO
  {
    mes: 8,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 31,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "DMED - Declaração de Serviços Médicos e de Saúde",
        vencimento: 31,
        observacoes: "Declaração anual dos serviços médicos prestados no exercício anterior."
      }
    ]
  },
  // SETEMBRO
  {
    mes: 9,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 30,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "eSocial - Eventos Periódicos",
        vencimento: 15,
        observacoes: "Transmissão dos eventos periódicos do eSocial referentes ao mês anterior."
      }
    ]
  },
  // OUTUBRO
  {
    mes: 10,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 31,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "GFIP - Guia de Recolhimento do FGTS",
        vencimento: 7,
        observacoes: "Informações previdenciárias e recolhimento do FGTS do mês anterior."
      }
    ]
  },
  // NOVEMBRO
  {
    mes: 11,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 30,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "CAGED - Cadastro Geral de Empregados e Desempregados",
        vencimento: 7,
        observacoes: "Declaração de movimentação de empregados do mês anterior."
      }
    ]
  },
  // DEZEMBRO
  {
    mes: 12,
    obrigacoes: [
      {
        titulo: "DCTF - Declaração de Débitos e Créditos Tributários Federais",
        vencimento: 15,
        observacoes: "Declaração referente ao mês anterior. Transmitir via PGD-DCTF no e-CAC."
      },
      {
        titulo: "GPS - Guia da Previdência Social (INSS)",
        vencimento: 20,
        observacoes: "Recolhimento das contribuições previdenciárias do mês anterior."
      },
      {
        titulo: "DARF - IRPJ e CSLL (Lucro Real/Presumido)",
        vencimento: 31,
        observacoes: "Recolhimento do Imposto de Renda Pessoa Jurídica e Contribuição Social sobre Lucro Líquido."
      },
      {
        titulo: "DARF - PIS/COFINS",
        vencimento: 25,
        observacoes: "Recolhimento das contribuições PIS e COFINS do mês anterior."
      },
      {
        titulo: "DIRPF - Declaração de Imposto de Renda Pessoa Física",
        vencimento: 31,
        observacoes: "Início do período de entrega da declaração anual (até abril do ano seguinte)."
      }
    ]
  }
];

// Função para ajustar data de vencimento para dia útil
function ajustarDiaUtil(data) {
  const diaSemana = data.getDay();
  
  // Se for sábado (6), move para segunda-feira
  if (diaSemana === 6) {
    data.setDate(data.getDate() + 2);
  }
  // Se for domingo (0), move para segunda-feira
  else if (diaSemana === 0) {
    data.setDate(data.getDate() + 1);
  }
  
  return data;
}

// Função para criar tarefas de um mês específico
async function criarTarefasMes(ano, mes, responsavelEmail = null) {
  try {
    console.log(`\n=== Criando tarefas da Agenda Tributária - ${mes}/${ano} ===`);
    
    // Buscar usuário administrador para ser responsável pelas tarefas
    let responsavel;
    if (responsavelEmail) {
      responsavel = await getUserByEmail(responsavelEmail);
      if (!responsavel) {
        console.log(`❌ Email ${responsavelEmail} não encontrado. Buscando administrador...`);
        responsavel = null;
      }
    }
    
    // Se não foi especificado responsável ou não foi encontrado, buscar primeiro admin
    if (!responsavel) {
      const users = await getAllUsers();
      responsavel = users.find(user => user.cargo === 'admin');
      
      if (!responsavel) {
        throw new Error('Nenhum usuário administrador encontrado no sistema');
      }
    }
    
    console.log(`✅ Responsável definido: ${responsavel.nome_completo} (${responsavel.email})`);
    
    // Buscar obrigações do mês
    const obrigacoesMes = OBRIGACOES_TRIBUTARIAS.find(obj => obj.mes === mes);
    if (!obrigacoesMes) {
      throw new Error(`Mês ${mes} inválido ou sem obrigações definidas`);
    }
    
    const tarefasCriadas = [];
    
    // Criar tarefa para cada obrigação
    for (const obrigacao of obrigacoesMes.obrigacoes) {
      const dataVencimento = new Date(ano, mes - 1, obrigacao.vencimento);
      
      // Ajustar para dia útil se necessário
      const dataVencimentoUtil = ajustarDiaUtil(new Date(dataVencimento));
      
      const taskData = {
        id: uuidv4(),
        titulo: obrigacao.titulo,
        responsavel: responsavel.nome_completo,
        responsavelId: responsavel.uid,
        dataVencimento: dataVencimentoUtil.toISOString(),
        observacoes: obrigacao.observacoes + 
                    `\n\n📅 Vencimento original: ${obrigacao.vencimento}/${mes}/${ano}` +
                    (dataVencimentoUtil.toDateString() !== dataVencimento.toDateString() ? 
                     `\n📅 Vencimento ajustado para dia útil: ${dataVencimentoUtil.toLocaleDateString('pt-BR')}` : ''),
        recorrente: true,
        frequencia: 'mensal'
      };
      
      try {
        await createTask(taskData);
        tarefasCriadas.push(taskData);
        console.log(`✅ ${obrigacao.titulo} - Vencimento: ${dataVencimentoUtil.toLocaleDateString('pt-BR')}`);
      } catch (error) {
        console.error(`❌ Erro ao criar tarefa "${obrigacao.titulo}": ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Concluído! ${tarefasCriadas.length} tarefas criadas para ${mes}/${ano}`);
    console.log(`📧 Responsável: ${responsavel.nome_completo} (${responsavel.email})`);
    
    return {
      sucesso: true,
      mes,
      ano,
      responsavel: responsavel.nome_completo,
      tarefasCriadas: tarefasCriadas.length,
      tarefas: tarefasCriadas
    };
    
  } catch (error) {
    console.error(`❌ Erro ao criar tarefas para ${mes}/${ano}:`, error.message);
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

// Função para criar tarefas de vários meses
async function criarTarefasMultiplosMeses(ano, meses, responsavelEmail = null) {
  const resultados = [];
  
  for (const mes of meses) {
    const resultado = await criarTarefasMes(ano, mes, responsavelEmail);
    resultados.push(resultado);
    
    // Pequena pausa entre criações
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return resultados;
}

// Função para criar tarefas do ano inteiro
async function criarTarefasAnoCompleto(ano, responsavelEmail = null) {
  console.log(`\n🚀 Criando agenda tributária completa para o ano ${ano}...`);
  
  const mesesDoAno = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const resultados = await criarTarefasMultiplosMeses(ano, mesesDoAno, responsavelEmail);
  
  const sucessos = resultados.filter(r => r.sucesso);
  const erros = resultados.filter(r => !r.sucesso);
  
  console.log(`\n📊 RESUMO GERAL - ${ano}`);
  console.log(`✅ Meses processados com sucesso: ${sucessos.length}`);
  console.log(`❌ Meses com erro: ${erros.length}`);
  
  if (sucessos.length > 0) {
    const totalTarefas = sucessos.reduce((total, r) => total + r.tarefasCriadas, 0);
    console.log(`📋 Total de tarefas criadas: ${totalTarefas}`);
  }
  
  if (erros.length > 0) {
    console.log(`\n❌ ERROS:`);
    erros.forEach(erro => {
      console.log(`   Mês ${erro.mes || 'N/A'}: ${erro.erro}`);
    });
  }
  
  return resultados;
}

// Função principal para execução via linha de comando
async function main() {
  const args = process.argv.slice(2);
  const comando = args[0];
  
  if (!comando) {
    console.log(`
🏛️  GERADOR DE AGENDA TRIBUTÁRIA
==================================

Uso:
  node agenda-tributaria.js mes <ano> <mes> [email_responsavel]
  node agenda-tributaria.js ano <ano> [email_responsavel]
  node agenda-tributaria.js proximo-mes [email_responsavel]
  node agenda-tributaria.js ajuda

Exemplos:
  node agenda-tributaria.js mes 2024 3                    # Criar tarefas de março/2024
  node agenda-tributaria.js mes 2024 3 admin@empresa.com  # Com responsável específico
  node agenda-tributaria.js ano 2024                      # Criar todo o ano de 2024
  node agenda-tributaria.js proximo-mes                   # Criar tarefas do próximo mês
    `);
    return;
  }
  
  try {
    switch (comando.toLowerCase()) {
      case 'mes':
        const ano = parseInt(args[1]);
        const mes = parseInt(args[2]);
        const email = args[3] || null;
        
        if (!ano || !mes || mes < 1 || mes > 12) {
          console.error('❌ Ano e mês são obrigatórios. Mês deve estar entre 1 e 12.');
          return;
        }
        
        await criarTarefasMes(ano, mes, email);
        break;
        
      case 'ano':
        const anoCompleto = parseInt(args[1]);
        const emailAno = args[2] || null;
        
        if (!anoCompleto) {
          console.error('❌ Ano é obrigatório.');
          return;
        }
        
        await criarTarefasAnoCompleto(anoCompleto, emailAno);
        break;
        
      case 'proximo-mes':
        const emailProximo = args[1] || null;
        const dataAtual = new Date();
        const proximoMes = dataAtual.getMonth() + 2; // +1 para próximo mês, +1 porque getMonth() é 0-based
        const anoProximo = proximoMes > 12 ? dataAtual.getFullYear() + 1 : dataAtual.getFullYear();
        const mesProximo = proximoMes > 12 ? 1 : proximoMes;
        
        console.log(`📅 Próximo mês: ${mesProximo}/${anoProximo}`);
        await criarTarefasMes(anoProximo, mesProximo, emailProximo);
        break;
        
      case 'ajuda':
      case 'help':
        console.log(`
🏛️  GERADOR DE AGENDA TRIBUTÁRIA
==================================

Este script automatiza a criação de tarefas mensais da agenda tributária brasileira.

COMANDOS DISPONÍVEIS:

1. mes <ano> <mes> [email]
   Cria tarefas para um mês específico.
   Exemplo: node agenda-tributaria.js mes 2024 3

2. ano <ano> [email]
   Cria tarefas para o ano inteiro.
   Exemplo: node agenda-tributaria.js ano 2024

3. proximo-mes [email]
   Cria tarefas para o próximo mês automaticamente.
   Exemplo: node agenda-tributaria.js proximo-mes

PARÂMETROS:
- ano: Ano de 4 dígitos (ex: 2024)
- mes: Mês de 1 a 12 (1=Janeiro, 12=Dezembro)
- email: Email do responsável (opcional). Se não informado, será usado o primeiro admin do sistema.

OBRIGAÇÕES INCLUÍDAS:
✅ DCTF - Declaração de Débitos e Créditos Tributários
✅ GPS - Guia da Previdência Social (INSS)
✅ DARF - IRPJ, CSLL, PIS/COFINS
✅ DIRF, RAIS, ECF, ECD (declarações anuais)
✅ eSocial, GFIP, CAGED
✅ E muitas outras obrigações...

FUNCIONALIDADES:
🗓️  Ajuste automático de datas para dias úteis
📝 Observações detalhadas para cada obrigação
🔄 Tarefas marcadas como recorrentes (mensais)
👤 Atribuição automática para administrador
        `);
        break;
        
      default:
        console.error(`❌ Comando "${comando}" não reconhecido. Use "ajuda" para ver os comandos disponíveis.`);
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
  criarTarefasMes,
  criarTarefasMultiplosMeses,
  criarTarefasAnoCompleto,
  OBRIGACOES_TRIBUTARIAS
};
