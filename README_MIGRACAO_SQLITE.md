# Migração do Firebase Storage para SQLite

Este documento descreve as mudanças realizadas para migrar o sistema de armazenamento de arquivos do Firebase Storage para SQLite.

## 🔄 Mudanças Principais

### Backend (Node.js)

#### 1. Novas Dependências
Foram adicionadas ao `package.json`:
```json
{
  "sqlite3": "^5.1.6",
  "multer": "^1.4.5-lts.1",
  "path": "^0.12.7",
  "fs": "^0.0.1-security"
}
```

#### 2. Novos Arquivos
- **`database.js`**: Módulo para gerenciar o banco SQLite com funções CRUD para arquivos
- **`uploads/`**: Diretório onde os arquivos são armazenados fisicamente
- **`data/`**: Diretório onde o banco SQLite (`pcp.db`) é armazenado

#### 3. Novos Endpoints na API

##### Upload de Arquivo
```
POST /api/upload
Content-Type: multipart/form-data

Parâmetros:
- file: arquivo (FormData)
- taskId: ID da tarefa (string)

Resposta:
{
  "id": 1,
  "url": "/api/files/1/download",
  "name": "documento.pdf",
  "size": 1024,
  "type": "application/pdf",
  "uploadDate": "2025-01-26T01:42:22Z",
  "uploadedBy": "user-uid"
}
```

##### Download de Arquivo
```
GET /api/files/:fileId/download

Headers: Authorization: Bearer <token>

Resposta: Stream do arquivo com headers apropriados
```

##### Listar Arquivos de uma Tarefa
```
GET /api/files/task/:taskId

Headers: Authorization: Bearer <token>

Resposta:
[
  {
    "id": 1,
    "url": "/api/files/1/download",
    "name": "documento.pdf",
    "size": 1024,
    "type": "application/pdf",
    "uploadDate": "2025-01-26T01:42:22Z",
    "uploadedBy": "user-uid",
    "downloadCount": 3
  }
]
```

##### Deletar Arquivo
```
DELETE /api/files/:fileId

Headers: Authorization: Bearer <token>

Resposta:
{
  "message": "Arquivo deletado com sucesso"
}
```

#### 4. Estrutura do Banco SQLite

##### Tabela `arquivos`
```sql
CREATE TABLE arquivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename VARCHAR(255) NOT NULL,           -- Nome único do arquivo no sistema
    original_name VARCHAR(255) NOT NULL,     -- Nome original do arquivo
    file_path VARCHAR(500) NOT NULL,         -- Caminho físico do arquivo
    mime_type VARCHAR(100) NOT NULL,         -- Tipo MIME do arquivo
    size INTEGER NOT NULL,                   -- Tamanho em bytes
    task_id VARCHAR(255) NOT NULL,           -- ID da tarefa associada
    uploaded_by VARCHAR(255) NOT NULL,       -- UID do usuário que fez upload
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    download_count INTEGER DEFAULT 0         -- Contador de downloads
);
```

##### Tabela `arquivo_logs` (opcional)
```sql
CREATE TABLE arquivo_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arquivo_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,             -- 'upload', 'download', 'delete'
    user_id VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (arquivo_id) REFERENCES arquivos (id)
);
```

### Frontend (React)

#### 1. Remoção do Firebase Storage
- Removido `import { getStorage } from "firebase/storage"`
- Removido `import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"`
- Removido `export const storage = getStorage(app)` do `firebase.js`

#### 2. Nova Lógica de Upload
A função `handleConfirmUpload` foi completamente reescrita para:
- Usar `FormData` para envio de arquivos
- Fazer requisições HTTP para a nova API
- Manter compatibilidade com o formato de dados existente no Firestore

#### 3. Fluxo de Upload Atualizado
1. Usuário seleciona arquivo → validação de tipo/tamanho
2. Preview do arquivo é exibido
3. Arquivo é enviado via POST para `/api/upload`
4. Metadata é salva no Firestore (para compatibilidade)
5. Estado local é atualizado

## 🚀 Como Instalar e Usar

### 1. Instalar Dependências
```bash
cd backend
npm install
```

### 2. Iniciar o Servidor
```bash
cd backend
npm start
```

O servidor criará automaticamente:
- Diretório `data/` com o banco SQLite
- Diretório `uploads/` para armazenar arquivos
- Tabelas necessárias no banco

### 3. Verificar Funcionamento
1. Acesse o sistema normalmente
2. Crie uma tarefa (como admin)
3. Tente fazer upload de um arquivo
4. Verifique se o arquivo foi salvo em `backend/uploads/`
5. Verifique se os metadados estão no SQLite

## 🔧 Configurações e Limites

### Tipos de Arquivo Suportados
- Imagens: JPEG, PNG, GIF, WebP
- Documentos: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- Texto: TXT, CSV

### Limites
- Tamanho máximo por arquivo: **10MB**
- Não há limite de quantidade de arquivos por tarefa

### Segurança
- Todos os endpoints exigem autenticação via token
- Usuários só podem fazer upload/download de arquivos de suas próprias tarefas
- Admins podem acessar todos os arquivos
- Validação de tipos de arquivo no backend e frontend

## 🔍 Monitoramento e Logs

### Logs do Sistema
O sistema registra automaticamente:
- Upload de arquivos
- Downloads (com contador)
- Exclusões de arquivos
- Erros de validação

### Verificar Banco SQLite
```bash
# Acessar o banco SQLite
sqlite3 backend/data/pcp.db

# Ver tabelas
.tables

# Ver arquivos
SELECT * FROM arquivos;

# Ver logs de atividade
SELECT * FROM arquivo_logs;
```

## 🐛 Troubleshooting

### Erro: "Nenhum arquivo enviado"
- Verifique se o `taskId` está sendo enviado corretamente
- Confirme que o arquivo foi selecionado

### Erro: "Arquivo físico não encontrado"
- Verifique se o diretório `uploads/` existe
- Confirme as permissões de escrita no diretório

### Erro: "Tipo de arquivo não suportado"
- Verifique a lista de tipos permitidos
- Confirme que o arquivo não está corrompido

### Banco SQLite não inicializa
```bash
# Remover banco e deixar recriar
rm backend/data/pcp.db
npm start
```

## 📊 Vantagens da Migração

### ✅ Benefícios
1. **Custo Zero**: Não há cobrança por armazenamento ou transferência
2. **Controle Total**: Todos os arquivos ficam no servidor local
3. **Backup Simples**: Basta fazer backup do diretório `uploads/` e `data/`
4. **Performance**: Acesso direto aos arquivos sem APIs externas
5. **Privacidade**: Dados não saem do seu servidor

### ⚠️ Considerações
1. **Backup**: Você é responsável pelo backup dos arquivos
2. **Escalabilidade**: Para alto volume, considere soluções de storage distribuído
3. **Espaço em Disco**: Monitore o uso de espaço no servidor

## 🔄 Compatibilidade

O sistema mantém **total compatibilidade** com:
- Arquivos já existentes no Firebase Storage
- Estrutura de dados no Firestore
- Interface do usuário
- Permissões e autenticação

Arquivos antigos continuarão funcionando normalmente, e novos uploads usarão o sistema SQLite.
