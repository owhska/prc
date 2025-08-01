# 🗄️ Guia de Acesso ao Banco SQLite - Sistema PCP

Este documento explica como acessar e consultar as tabelas do banco SQLite usado no projeto PCP (Planejamento e Controle de Produção).

---

## 📍 Localização do Banco SQLite

O arquivo do banco está localizado em:

```
backend/data/pcp.db
```

**Caminho absoluto no seu sistema:**
```
C:\Users\mathe\PCP\PCP\backend\data\pcp.db
```

---

## 🛠️ Requisitos

- **SQLite CLI** instalado no sistema
  - Para Windows: [SQLite Download Page](https://sqlite.org/download.html)
  - Para usuários do Node.js: `npm install -g sqlite3`
- Acesso ao terminal/PowerShell do Windows

---

## 🚀 Como abrir o banco no terminal

### Opção 1: Via terminal/PowerShell

1. Navegue até a pasta do backend:
```bash
cd C:\Users\mathe\PCP\PCP\backend
```

2. Execute o SQLite CLI:
```bash
sqlite3 data/pcp.db
```

### Opção 2: Caminho direto
```bash
sqlite3 "C:\Users\mathe\PCP\PCP\backend\data\pcp.db"
```

---

## 📋 Comandos Úteis no SQLite CLI

### Comandos básicos de navegação

```sql
-- Listar todas as tabelas
.tables

-- Ver estrutura completa do banco
.schema

-- Ver estrutura de uma tabela específica
.schema usuarios

-- Configurar modo de saída para melhor visualização
.mode column
.headers on

-- Sair do SQLite CLI
.exit
```

### Comandos de consulta

```sql
-- Ver todos os usuários
SELECT * FROM usuarios;

-- Contar total de usuários
SELECT COUNT(*) as total_usuarios FROM usuarios;

-- Ver apenas administradores
SELECT * FROM usuarios WHERE cargo = 'admin';

-- Ver tarefas mais recentes
SELECT * FROM tarefas ORDER BY created_at DESC LIMIT 10;

-- Ver pontos de um usuário específico
SELECT * FROM pontos WHERE user_id = 'seu_uid_aqui' ORDER BY timestamp DESC;

-- Ver logs de atividade recentes
SELECT * FROM atividade_logs ORDER BY timestamp DESC LIMIT 20;
```

---

## 🗂️ Principais Tabelas do Sistema

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| **`usuarios`** | Usuários do sistema | `uid`, `nome_completo`, `email`, `cargo`, `created_at` |
| **`tarefas`** | Tarefas do projeto | `id`, `titulo`, `descricao`, `responsavel_uid`, `status`, `created_at` |
| **`pontos`** | Registro de pontos dos usuários | `id`, `user_id`, `timestamp`, `tipo`, `observacoes` |
| **`horas_trabalhadas`** | Horas trabalhadas por dia | `id`, `user_id`, `data`, `horas`, `created_at` |
| **`arquivos`** | Metadados dos arquivos | `id`, `nome_original`, `nome_arquivo`, `tarefa_id`, `uploaded_by` |
| **`atividade_logs`** | Logs de atividades gerais | `id`, `user_id`, `acao`, `detalhes`, `timestamp` |
| **`arquivo_logs`** | Logs específicos de arquivos | `id`, `arquivo_id`, `user_id`, `acao`, `timestamp` |

---

## 🔍 Consultas Úteis para Administração

### Verificar usuários e seus papéis
```sql
SELECT 
    nome_completo as Nome,
    email as Email,
    cargo as Cargo,
    created_at as Cadastrado_em
FROM usuarios 
ORDER BY cargo DESC, nome_completo;
```

### Ver estatísticas gerais
```sql
-- Total de registros por tabela
SELECT 'Usuários' as Tabela, COUNT(*) as Total FROM usuarios
UNION ALL
SELECT 'Tarefas', COUNT(*) FROM tarefas
UNION ALL
SELECT 'Pontos', COUNT(*) FROM pontos
UNION ALL
SELECT 'Horas Trabalhadas', COUNT(*) FROM horas_trabalhadas
UNION ALL
SELECT 'Arquivos', COUNT(*) FROM arquivos;
```

### Atividade recente no sistema
```sql
SELECT 
    u.nome_completo as Usuario,
    a.acao as Acao,
    a.detalhes as Detalhes,
    datetime(a.timestamp, 'localtime') as Data_Hora
FROM atividade_logs a
JOIN usuarios u ON a.user_id = u.uid
ORDER BY a.timestamp DESC
LIMIT 50;
```

### Tarefas por status
```sql
SELECT 
    status,
    COUNT(*) as quantidade
FROM tarefas 
GROUP BY status
ORDER BY quantidade DESC;
```

---

## 🛡️ Segurança e Boas Práticas

### ⚠️ IMPORTANTE - Operações de Escrita

- **NUNCA execute comandos `INSERT`, `UPDATE` ou `DELETE` diretamente no banco**
- **Use sempre as APIs do backend** para modificar dados
- O backend garante:
  - Validação de dados
  - Logs de auditoria
  - Integridade referencial
  - Controle de permissões

### ✅ Operações Seguras (Apenas Leitura)

```sql
-- ✅ SEGURO - Apenas consultas SELECT
SELECT * FROM usuarios WHERE email = 'usuario@empresa.com';

-- ❌ PERIGOSO - Não execute diretamente
-- UPDATE usuarios SET cargo = 'admin' WHERE email = 'usuario@empresa.com';
```

### 📊 Para modificações, use os endpoints da API:

```bash
# Atualizar cargo de usuário via API
curl -X PUT http://localhost:3001/api/usuarios/cargo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"uid": "user_uid", "cargo": "admin"}'
```

---

## 🔧 Ferramentas Alternativas

### Clientes Gráficos Recomendados

1. **DB Browser for SQLite** (Gratuito)
   - Download: https://sqlitebrowser.org/
   - Interface gráfica amigável

2. **SQLite Studio** (Gratuito)
   - Download: https://sqlitestudio.pl/
   - Recursos avançados de administração

3. **DBeaver** (Gratuito/Pago)
   - Download: https://dbeaver.io/
   - Suporte a múltiplos SGBDs

---

## 🆘 Resolução de Problemas

### Erro: "database is locked"
```bash
# Verificar se a aplicação Node.js está rodando
# Fechar a aplicação antes de acessar diretamente o banco
```

### Erro: "no such file or directory"
```bash
# Verificar se está na pasta correta
pwd
ls -la data/  # Deve mostrar o arquivo pcp.db
```

### Backup do banco
```bash
# Criar backup do banco
sqlite3 data/pcp.db ".backup backup_pcp_$(date +%Y%m%d_%H%M%S).db"

# Ou copiar o arquivo diretamente
cp data/pcp.db data/pcp_backup_$(date +%Y%m%d_%H%M%S).db
```

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Consulte os logs da aplicação em `backend/logs/`
2. Verifique se todas as dependências estão instaladas
3. Consulte a documentação da API em `backend/routes/`
4. Entre em contato com a equipe de desenvolvimento

---

**⚡ Lembre-se:** Este banco contém dados importantes do sistema PCP. Sempre faça backups antes de qualquer manutenção e use as APIs para modificações de dados.
