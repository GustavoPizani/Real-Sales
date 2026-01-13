# 🚀 Guia Completo de Deploy - Real Sales CRM

## 📋 Pré-requisitos

- Conta no GitHub
- Conta na Vercel
- Banco de dados Neon (já configurado)

## 🔧 Passo a Passo para Deploy

### 1. Preparar o Repositório GitHub

\`\`\`bash
# 1. Inicializar repositório Git (se ainda não foi feito)
git init

# 2. Adicionar todos os arquivos
git add .

# 3. Fazer commit inicial
git commit -m "feat: sistema CRM completo com gestão de propriedades"

# 4. Adicionar repositório remoto (substitua pela sua URL)
git remote add origin https://github.com/SEU_USUARIO/real-sales-crm.git

# 5. Fazer push para o GitHub
git push -u origin main
\`\`\`

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com:

\`\`\`env
# Banco de dados Neon
DATABASE_URL="postgresql://neondb_owner:npg_In8ZcBvgX3eD@ep-steep-dust-ad9sqscl-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Autenticação
JWT_SECRET="b7bf7faa191b055bed080d8438a5e5e5"
NEXTAUTH_URL="https://SEU_DOMINIO.vercel.app"
NEXTAUTH_SECRET="minha-chave-nextauth-super-secreta-123"

# Ambiente
NODE_ENV="production"
\`\`\`

### 3. Deploy na Vercel

#### Opção A: Via Dashboard Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Conecte sua conta GitHub
4. Selecione o repositório `real-sales-crm`
5. Configure as variáveis de ambiente:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NODE_ENV`
6. Clique em "Deploy"

#### Opção B: Via CLI Vercel
\`\`\`bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy
vercel

# 4. Configurar variáveis de ambiente
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
vercel env add NODE_ENV
\`\`\`

### 4. Executar Scripts do Banco de Dados

Após o deploy, execute os scripts na seguinte ordem:

\`\`\`bash
# 1. Criar schema do banco
# Execute o conteúdo de scripts/001-create-database-schema.sql no console do Neon

# 2. Inserir dados iniciais
# Execute o conteúdo de scripts/002-seed-initial-data.sql no console do Neon

# 3. Adicionar tabela de alterações
# Execute o conteúdo de scripts/003-add-property-changes-table.sql no console do Neon

# 4. Atualizar dados com seu usuário
# Execute o conteúdo de scripts/004-update-seed-data.sql no console do Neon
\`\`\`

### 5. Primeiro Acesso

**Credenciais de Acesso:**
- **Email:** `pizani@realsales.com.br`
- **Senha:** `RealSales2024!`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

### 6. Verificações Pós-Deploy

1. **Teste de Login:**
   - Acesse sua URL da Vercel
   - Faça login com as credenciais acima
   - Verifique se o dashboard carrega corretamente

2. **Teste de Funcionalidades:**
   - Criar novo imóvel
   - Upload de images
   - Auto-save
   - Sistema de aprovações

3. **Verificar Banco de Dados:**
   - Acesse o console do Neon
   - Verifique se todas as tabelas foram criadas
   - Confirme se os dados iniciais estão presentes

## 🔧 Configurações Adicionais

### Domínio Personalizado (Opcional)
1. No dashboard da Vercel, vá em "Settings" > "Domains"
2. Adicione seu domínio personalizado
3. Configure os DNS conforme instruções da Vercel
4. Atualize a variável `NEXTAUTH_URL`

### Monitoramento
1. Configure alertas na Vercel para erros
2. Monitore uso do banco Neon
3. Configure backup automático (recomendado)

### Segurança
1. **Altere todas as chaves secretas** em produção
2. Configure CORS adequadamente
3. Implemente rate limiting se necessário
4. Configure SSL/HTTPS (automático na Vercel)

## 📊 Métricas e Monitoramento

### Vercel Analytics
- Ative o Vercel Analytics no dashboard
- Monitore performance e uso

### Banco de Dados
- Monitore conexões no Neon
- Configure alertas de uso
- Faça backups regulares

## 🚨 Troubleshooting

### Erro de Conexão com Banco
\`\`\`bash
# Verifique se a DATABASE_URL está correta
# Teste a conexão no console do Neon
\`\`\`

### Erro de Build
\`\`\`bash
# Verifique os logs no dashboard da Vercel
# Confirme se todas as dependências estão no package.json
\`\`\`

### Erro de Autenticação
\`\`\`bash
# Verifique se NEXTAUTH_URL está correto
# Confirme se JWT_SECRET está configurado
\`\`\`

## 📝 Comandos Úteis

\`\`\`bash
# Ver logs em tempo real
vercel logs

# Fazer redeploy
vercel --prod

# Ver informações do projeto
vercel inspect

# Configurar alias
vercel alias
\`\`\`

## 🎯 Próximos Passos

Após o deploy bem-sucedido:

1. **Configurar usuários:** Adicione outros usuários do sistema
2. **Importar dados:** Se houver dados existentes para migrar
3. **Treinar equipe:** Apresente o sistema para os usuários
4. **Monitorar:** Acompanhe uso e performance
5. **Backup:** Configure rotina de backup dos dados

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs da Vercel
2. Consulte a documentação do Neon
3. Verifique as variáveis de ambiente
4. Teste localmente primeiro

---

**✅ Sistema pronto para produção!**
\`\`\`

Agora vou atualizar o botão "Novo Imóvel" na página de listagem:
