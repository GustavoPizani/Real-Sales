# 🚀 Guia de Deploy na Vercel

## 📋 Pré-requisitos

1. ✅ Conta no [Vercel](https://vercel.com)
2. ✅ Conta no [Neon](https://neon.tech) (banco de dados)
3. ✅ Repositório no GitHub com o código

## 🗄️ Configurar Banco de Dados

### 1. Criar Projeto no Neon
1. Acesse [neon.tech](https://neon.tech)
2. Clique em "Sign Up" ou "Sign In"
3. Crie um novo projeto: **"real-sales-crm"**
4. Escolha região: **US East (Ohio)** ou mais próxima
5. Copie a **Connection String**

### 2. Executar Scripts SQL
No console SQL do Neon, execute em ordem:

\`\`\`sql
-- 1. Executar: scripts/001-create-database-schema.sql
-- 2. Executar: scripts/002-seed-initial-data.sql
\`\`\`

## 🚀 Deploy na Vercel

### 1. Conectar Repositório
1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"New Project"**
3. Conecte sua conta do GitHub
4. Selecione o repositório **"Real-sales"**
5. Clique em **"Import"**

### 2. Configurar Variáveis de Ambiente
Na página de configuração do projeto:

1. Vá para **"Environment Variables"**
2. Adicione as seguintes variáveis:

\`\`\`bash
# Obrigatórias
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
JWT_SECRET=sua-chave-jwt-super-secreta-mude-em-producao
NEXTAUTH_URL=https://seu-dominio.vercel.app
NEXTAUTH_SECRET=sua-chave-nextauth-secreta

# Opcionais (deixe em branco por enquanto)
GOOGLE_SHEETS_API_KEY=
META_ADS_WEBHOOK_SECRET=
\`\`\`

### 3. Configurações de Build
- **Framework Preset**: Next.js
- **Build Command**: `pnpm run build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

### 4. Deploy
1. Clique em **"Deploy"**
2. Aguarde o build (2-5 minutos)
3. ✅ Deploy concluído!

## 🔧 Pós-Deploy

### 1. Testar Sistema
1. Acesse a URL do seu projeto
2. Faça login com:
   - **Email**: `pizani@realsales.com.br`
   - **Senha**: `RealSales2024!`

### 2. Configurar Domínio (Opcional)
1. Vá para **"Settings" > "Domains"**
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

### 3. Monitoramento
- **Analytics**: Habilitado automaticamente
- **Logs**: Disponíveis na aba "Functions"
- **Performance**: Métricas em tempo real

## 🚨 Solução de Problemas

### Erro: "DATABASE_URL is not defined"
\`\`\`bash
# Solução:
1. Verificar se DATABASE_URL está nas Environment Variables
2. Redeployar o projeto
3. Verificar se a string de conexão está correta
\`\`\`

### Erro: "Build failed"
\`\`\`bash
# Solução:
1. Verificar logs de build na Vercel
2. Testar build local: npm run build
3. Verificar se todas as dependências estão no package.json
\`\`\`

### Erro: "Function timeout"
\`\`\`bash
# Solução:
1. Verificar se o banco está respondendo
2. Otimizar queries SQL
3. Verificar se há loops infinitos
\`\`\`

### Erro: "Module not found"
\`\`\`bash
# Solução:
1. Verificar imports relativos vs absolutos
2. Verificar se arquivo existe no repositório
3. Limpar cache: Settings > General > Clear Cache
\`\`\`

## 📊 Monitoramento e Manutenção

### Logs de Aplicação
\`\`\`bash
# Acessar logs:
1. Vercel Dashboard > Seu Projeto
2. Aba "Functions"
3. Clique em qualquer função para ver logs
\`\`\`

### Performance
\`\`\`bash
# Métricas importantes:
- Response Time: < 1s
- Error Rate: < 1%
- Build Time: < 5min
- Cold Start: < 500ms
\`\`\`

### Backup do Banco
\`\`\`bash
# No Neon:
1. Dashboard > Seu Projeto
2. Aba "Backups"
3. Configurar backup automático
\`\`\`

## ✅ Checklist Final

- [ ] ✅ Projeto deployado sem erros
- [ ] ✅ Login funcionando
- [ ] ✅ Dashboard carregando
- [ ] ✅ Banco de dados conectado
- [ ] ✅ Todas as páginas acessíveis
- [ ] ✅ Responsivo no mobile
- [ ] ✅ Performance satisfatória
- [ ] ✅ Domínio configurado (se aplicável)
- [ ] ✅ Monitoramento ativo

## 🎉 Sistema em Produção!

Seu CRM Real Sales está agora rodando em produção na Vercel!

**URL de acesso**: https://seu-projeto.vercel.app
**Credenciais iniciais**:
- Email: `pizani@realsales.com.br`
- Senha: `RealSales2024!`

**🔐 Lembre-se de alterar a senha após o primeiro login!**
