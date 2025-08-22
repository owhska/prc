# 🚀 Deploy no Render - Guia Completo

## 📋 Problemas Identificados e Soluções

### ❌ Problemas Anteriores:
1. **CORS restritivo**: Backend só aceitava localhost
2. **URLs hardcoded**: Frontend apontava apenas para localhost:3001
3. **Configuração de ambiente**: Sem variáveis dinâmicas
4. **Scripts inadequados**: package.json não otimizado para produção

### ✅ Soluções Implementadas:
1. **CORS dinâmico**: Agora aceita domínios do Render via variáveis de ambiente
2. **URLs configuráveis**: Frontend detecta ambiente automaticamente
3. **Banco SQLite otimizado**: Configurado para criar diretórios automaticamente
4. **Scripts de produção**: package.json otimizado para ambos os serviços

## 🔧 Configuração no Render

### Opção 1: Usar render.yaml (Recomendado)
1. Commit e push das alterações para o repositório
2. No Render Dashboard, conecte o repositório
3. O arquivo `render.yaml` será detectado automaticamente
4. Configure as variáveis de ambiente no dashboard

### Opção 2: Configuração Manual

#### Backend Service:
- **Type**: Web Service
- **Name**: calendario-backend
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: `backend`

**Environment Variables:**
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://SEU_FRONTEND_URL.onrender.com
```

#### Frontend Service:
- **Type**: Static Site
- **Name**: calendario-frontend
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Root Directory**: `frontend`

**Environment Variables:**
```
NODE_ENV=production
REACT_APP_API_URL=https://SEU_BACKEND_URL.onrender.com/api
```

## 🔄 Processo de Deploy

1. **Primeiro, faça deploy do Backend**:
   - Espere estar funcionando
   - Teste o endpoint `/api/health`
   - Copie a URL do backend

2. **Depois, faça deploy do Frontend**:
   - Configure `REACT_APP_API_URL` com a URL do backend
   - Deploy do frontend
   - Copie a URL do frontend

3. **Configure CORS no Backend**:
   - Adicione a URL do frontend na variável `FRONTEND_URL`
   - Redeploy do backend

## 🧪 Testando o Deploy

### Endpoints para testar:
```
GET https://SEU_BACKEND_URL.onrender.com/api/health
GET https://SEU_FRONTEND_URL.onrender.com
```

### Verificações importantes:
1. ✅ Backend responde no endpoint `/api/health`
2. ✅ Frontend carrega a página de login
3. ✅ Login funciona (teste com um usuário)
4. ✅ CORS permite comunicação entre frontend e backend
5. ✅ Banco SQLite é criado automaticamente

## 🐛 Problemas Comuns e Soluções

### ❌ "Access to fetch at '...' from origin '...' has been blocked by CORS policy"
**Solução**: Configure a variável `FRONTEND_URL` no backend com a URL do frontend

### ❌ "Erro de conexão com o servidor"
**Solução**: Verifique se `REACT_APP_API_URL` no frontend está correto

### ❌ "Cannot find module 'sqlite3'"
**Solução**: SQLite3 é nativo - se houver problemas, verifique os logs do Render

### ❌ "Arquivo físico não encontrado" (uploads)
**Solução**: No Render, uploads são temporários. Para produção, use serviços externos como AWS S3

## 📂 Estrutura de Arquivos Importante

```
├── backend/
│   ├── data/           # Banco SQLite (criado automaticamente)
│   ├── uploads/        # Arquivos (temporário no Render)
│   ├── package.json    # Scripts otimizados
│   └── server.js       # CORS dinâmico
├── frontend/
│   ├── dist/           # Build de produção (gerado)
│   ├── package.json    # Scripts otimizados
│   └── src/
│       └── AuthContext.jsx  # URLs dinâmicas
├── render.yaml         # Configuração do Render
└── .env.example       # Variáveis de ambiente
```

## 🔐 Variáveis de Ambiente Necessárias

### Backend:
- `NODE_ENV=production`
- `PORT=10000` (padrão do Render)
- `FRONTEND_URL=https://seu-frontend.onrender.com`

### Frontend:
- `NODE_ENV=production`  
- `REACT_APP_API_URL=https://seu-backend.onrender.com/api`

## 🚨 Limitações do Plano Gratuito

1. **SQLite**: Dados podem ser perdidos no redeploy
2. **Uploads**: Arquivos são temporários
3. **Hibernação**: Serviços adormecem após 15min de inatividade
4. **Performance**: Recursos limitados

### Recomendações para Produção:
- Migrar para PostgreSQL (disponível no Render)
- Usar AWS S3 para uploads
- Considerar plano pago para evitar hibernação

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs no Dashboard do Render
2. Teste os endpoints individualmente
3. Verifique se as variáveis de ambiente estão corretas
4. Confirme se o banco SQLite está sendo criado (logs do backend)
