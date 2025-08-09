# 🏛️ Agenda Tributária - Sistema Automatizado

Este sistema automatiza a criação de tarefas mensais baseadas na **Agenda Tributária Brasileira**, incluindo todas as principais obrigações fiscais e trabalhistas.

## 📋 Funcionalidades

- ✅ **Criação automática de tarefas** para todas as obrigações tributárias mensais
- 📅 **Ajuste inteligente de datas** para dias úteis (evita fins de semana)
- 🔄 **Tarefas recorrentes** marcadas automaticamente como mensais
- 👤 **Atribuição automática** para o usuário Administrador
- 📝 **Observações detalhadas** com instruções específicas para cada obrigação
- 🗓️ **Flexibilidade** para criar tarefas por mês específico, ano completo ou próximo mês

## 🎯 Obrigações Incluídas

### Mensais (todos os meses):
- **DCTF** - Declaração de Débitos e Créditos Tributários Federais
- **GPS** - Guia da Previdência Social (INSS)
- **DARF** - IRPJ, CSLL, PIS/COFINS
- E outras obrigações específicas por mês...

### Anuais (meses específicos):
- **DIRF** - Declaração do IR Retido na Fonte (Janeiro)
- **RAIS** - Relação Anual de Informações Sociais (Fevereiro)
- **ECF** - Escrituração Contábil Fiscal (Março)
- **ECD** - Escrituração Contábil Digital (Abril)
- **DIPJ** - Declaração Econômico-Fiscais PJ (Maio)
- E muitas outras...

## 🚀 Como Usar

### Via Linha de Comando

1. **Navegar até o diretório do script:**
```bash
cd backend/scripts
```

2. **Comandos disponíveis:**

#### Criar tarefas de um mês específico:
```bash
node agenda-tributaria.js mes 2024 3
# Cria tarefas para março/2024

node agenda-tributaria.js mes 2024 3 admin@empresa.com
# Com responsável específico
```

#### Criar tarefas do ano completo:
```bash
node agenda-tributaria.js ano 2024
# Cria todas as tarefas de 2024

node agenda-tributaria.js ano 2024 contador@empresa.com
# Com responsável específico
```

#### Criar tarefas do próximo mês:
```bash
node agenda-tributaria.js proximo-mes
# Cria automaticamente para o próximo mês

node agenda-tributaria.js proximo-mes admin@empresa.com
# Com responsável específico
```

#### Ver ajuda completa:
```bash
node agenda-tributaria.js ajuda
```

### Via API REST

O sistema também disponibiliza endpoints REST para integração com o frontend:

#### 1. Listar obrigações disponíveis:
```http
GET /api/agenda-tributaria/obrigacoes
Authorization: Bearer {token}
```

#### 2. Criar tarefas de um mês:
```http
POST /api/agenda-tributaria/criar-mes
Authorization: Bearer {token}
Content-Type: application/json

{
  "ano": 2024,
  "mes": 3,
  "responsavelEmail": "admin@empresa.com"
}
```

#### 3. Criar tarefas do ano completo:
```http
POST /api/agenda-tributaria/criar-ano
Authorization: Bearer {token}
Content-Type: application/json

{
  "ano": 2024,
  "responsavelEmail": "contador@empresa.com"
}
```

#### 4. Criar tarefas do próximo mês:
```http
POST /api/agenda-tributaria/proximo-mes
Authorization: Bearer {token}
Content-Type: application/json

{
  "responsavelEmail": "admin@empresa.com"
}
```

## 📊 Exemplo de Saída

```
=== Criando tarefas da Agenda Tributária - 3/2024 ===
✅ Responsável definido: João Silva (admin@empresa.com)
✅ DCTF - Declaração de Débitos e Créditos Tributários Federais - Vencimento: 15/03/2024
✅ GPS - Guia da Previdência Social (INSS) - Vencimento: 20/03/2024
✅ DARF - IRPJ e CSLL (Lucro Real/Presumido) - Vencimento: 31/03/2024
✅ DARF - PIS/COFINS - Vencimento: 25/03/2024
✅ ECF - Escrituração Contábil Fiscal - Vencimento: 31/03/2024

🎉 Concluído! 5 tarefas criadas para 3/2024
📧 Responsável: João Silva (admin@empresa.com)
```

## ⚙️ Configuração de Responsável

1. **Automático**: Se não especificar responsável, será usado o primeiro usuário com cargo "admin" do sistema
2. **Por email**: Especifique o email de qualquer usuário cadastrado
3. **Fallback**: Se o email não for encontrado, volta para o admin padrão

## 🗂️ Estrutura das Tarefas Criadas

Cada tarefa criada terá:

- **Título**: Nome completo da obrigação (ex: "DCTF - Declaração de Débitos...")
- **Responsável**: Administrador ou usuário especificado
- **Data de Vencimento**: Data ajustada para dia útil se necessário
- **Status**: "pendente"
- **Recorrente**: Sim (frequência mensal)
- **Observações**: Instruções detalhadas + data original de vencimento

## 🔧 Integração com o Sistema

As tarefas criadas:
- ✅ Aparecem no calendário principal
- ✅ São listadas no gerenciador de tarefas
- ✅ Podem receber arquivos comprovantes
- ✅ Têm status atualizável pelos responsáveis
- ✅ Geram logs de atividade
- ✅ São compatíveis com todos os recursos existentes

## 📝 Logs e Auditoria

Todas as criações de agenda tributária são registradas nos logs do sistema:
- Data e hora da criação
- Usuário que executou
- Quantidade de tarefas criadas
- Período processado

## 🎛️ Automação Sugerida

### Cron Job Mensal
Para automatizar completamente, configure um cron job:

```bash
# Executar todo dia 25 às 09:00 para criar tarefas do próximo mês
0 9 25 * * cd /caminho/para/backend/scripts && node agenda-tributaria.js proximo-mes
```

### Script de Inicialização Anual
No início de cada ano:

```bash
# Criar todas as tarefas do ano
node agenda-tributaria.js ano 2024
```

## 🛠️ Personalização

O arquivo `agenda-tributaria.js` pode ser personalizado para:
- Adicionar/remover obrigações específicas
- Ajustar datas de vencimento
- Modificar observações
- Incluir obrigações estaduais/municipais específicas

## 📞 Suporte

Para dúvidas ou problemas:
1. Execute `node agenda-tributaria.js ajuda`
2. Verifique os logs no console
3. Verifique se há um usuário admin no sistema
4. Certifique-se de que o banco de dados está funcionando

---

**💡 Dica**: Execute primeiro um mês de teste para verificar se tudo está funcionando corretamente antes de criar o ano completo!
