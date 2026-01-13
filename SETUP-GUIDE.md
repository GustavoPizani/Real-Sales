# 🚀 Guia Completo - Real Sales CRM com Google Sheets

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Neon Database (gratuita)
- Conta no Google Cloud Platform (gratuita)
- Planilha do Google Sheets

## 🔧 Configuração Passo a Passo

### 1. **Gerar JWT Secret (MUITO IMPORTANTE!)**

Abra o terminal e execute este comando:

\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

**Exemplo de resultado:**
\`\`\`
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
\`\`\`

⚠️ **GUARDE ESTA CHAVE!** Você vai precisar dela no `.env.local`

### 2. **Configurar Banco de Dados (Neon)**

1. Acesse [neon.tech](https://neon.tech)
2. Crie uma conta gratuita
3. Clique em "Create Project"
4. Nome: "real-sales-crm"
5. Copie a **Connection String** que aparece

### 3. **Configurar Google Sheets**

#### 3.1 Criar Service Account
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Vá em "APIs & Services" > "Credentials"
4. Clique em "Create Credentials" > "Service Account"
5. Nome: "sheets-crm-sync"
6. Clique em "Create and Continue"

#### 3.2 Gerar Chave Privada
1. Na lista de Service Accounts, clique no que você criou
2. Vá na aba "Keys"
3. Clique em "Add Key" > "Create New Key"
4. Escolha "JSON" e clique em "Create"
5. **Salve o arquivo JSON!**

#### 3.3 Ativar Google Sheets API
1. Vá em "APIs & Services" > "Library"
2. Procure por "Google Sheets API"
3. Clique em "Enable"

#### 3.4 Configurar a Planilha
1. Crie uma nova planilha no Google Sheets
2. Renameie a primeira aba para "Leads"
3. Na linha 1, coloque os cabeçalhos:
   \`\`\`
   A1: Nome
   B1: Email  
   C1: Telefone
   D1: Interesse
   E1: Orçamento
   F1: Observações
   G1: Data/Hora
   \`\`\`
4. Compartilhe a planilha com o email do Service Account (do arquivo JSON)
5. Copie o ID da planilha da URL (parte entre `/d/` e `/edit`)

### 4. **Instalar Dependências**

\`\`\`bash
npm install bcryptjs jsonwebtoken googleapis @types/bcryptjs @types/jsonwebtoken
\`\`\`

### 5. **Configurar Variáveis de Ambiente**

Crie o arquivo `.env.local` na raiz do projeto:

\`\`\`env
# Database (cole sua URL do Neon)
DATABASE_URL="postgresql://seu-usuario:sua-senha@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# JWT Secret (cole a chave que você gerou)
JWT_SECRET="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"

# Google Sheets (do arquivo JSON baixado)
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_DO_JSON\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL="sheets-crm-sync@seu-projeto.iam.gserviceaccount.com"
GOOGLE_SPREADSHEET_ID="1ABC123DEF456GHI789JKL"

# API Key para sync (gere uma chave qualquer)
SYNC_API_KEY="minha-chave-secreta-123456"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
\`\`\`

### 6. **Configurar Banco de Dados**

1. Acesse o painel do Neon
2. Vá em "SQL Editor"
3. Execute o arquivo `scripts/001-create-database-schema.sql`
4. Execute o arquivo `scripts/002-seed-initial-data.sql`

### 7. **Testar o Sistema**

\`\`\`bash
npm run dev
\`\`\`

Acesse: http://localhost:3000

**Login padrão:**
- Email: `admin@realsales.com`
- Senha: `admin123`

## 🔄 Como Sincronizar com Google Sheets

### Método 1: Manual (para testar)

Faça uma requisição POST para:
\`\`\`
POST http://localhost:3000/api/sync/google-sheets
Headers: x-api-key: minha-chave-secreta-123456
\`\`\`

### Método 2: Automático (recomendado)

Configure um cron job ou use um serviço como Zapier/Make para chamar a API a cada 15 minutos.

### Método 3: Webhook do Google Sheets

Configure um Google Apps Script na sua planilha para chamar a API sempre que houver mudanças.

## 📊 Estrutura da Planilha

Sua planilha deve ter esta estrutura na aba "Leads":

| A (Nome) | B (Email) | C (Telefone) | D (Interesse) | E (Orçamento) | F (Observações) | G (Data/Hora) |
|----------|-----------|--------------|---------------|---------------|-----------------|---------------|
| João Silva | joao@email.com | (11) 99999-1111 | Apartamento 2 quartos | R$ 300.000 | Cliente interessado | 2024-01-15 10:30 |

## 🎯 Funcionalidades Disponíveis

### ✅ **Sistema Completo**
- Login seguro com JWT
- Dashboard com métricas
- Gestão de leads e clientes
- Sistema de tarefas
- Gestão de propriedades
- Sincronização automática com Google Sheets

### ✅ **APIs Funcionais**
- `POST /api/auth/login` - Login
- `GET/POST /api/clients` - Clientes
- `GET/POST /api/leads` - Leads
- `POST /api/leads/[id]/convert` - Converter lead
- `GET/POST /api/tasks` - Tarefas
- `GET/POST /api/properties` - Propriedades
- `POST /api/sync/google-sheets` - Sincronizar planilha

## 🚨 Solução de Problemas

### Erro de JWT
\`\`\`
Error: JWT_SECRET is required
\`\`\`
**Solução:** Verifique se o `JWT_SECRET` está no `.env.local` e tem pelo menos 32 caracteres.

### Erro de Google Sheets
\`\`\`
Error: Unable to read from Google Sheets
\`\`\`
**Solução:** 
1. Verifique se a planilha foi compartilhada com o Service Account
2. Confirme se o `GOOGLE_SPREADSHEET_ID` está correto
3. Verifique se a Google Sheets API está ativada

### Erro de Banco
\`\`\`
Error: Connection refused
\`\`\`
**Solução:** Verifique se a `DATABASE_URL` está correta e inclui `?sslmode=require`

## 📞 Testando a Integração

1. **Adicione um lead na planilha**
2. **Chame a API de sync:**
   \`\`\`bash
   curl -X POST http://localhost:3000/api/sync/google-sheets \
   -H "x-api-key: minha-chave-secreta-123456"
   \`\`\`
3. **Verifique no CRM** se o lead apareceu

## 🎉 Pronto!

Seu CRM está 100% funcional com:
- ✅ Autenticação JWT segura
- ✅ APIs completas
- ✅ Integração com Google Sheets
- ✅ Sincronização automática de leads
- ✅ Sistema completo de CRM

**Agora você pode capturar leads na planilha e eles aparecerão automaticamente no seu CRM!** 🚀
