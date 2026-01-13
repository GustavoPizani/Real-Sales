# Real Sales CRM

Sistema de CRM completo para corretores de imóveis desenvolvido com Next.js 14, TypeScript e PostgreSQL.

## 🚀 Funcionalidades

- **Dashboard** com métricas e visão geral
- **Gestão de Clientes** completa
- **Sistema de Tarefas** com prioridades e prazos
- **Catálogo de Propriedades** 
- **Pipeline de Vendas** visual
- **Autenticação JWT** segura
- **Interface responsiva** com Tailwind CSS

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL (Neon)
- **Autenticação**: JWT com bcryptjs
- **UI**: shadcn/ui components
- **Database**: Neon PostgreSQL

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Neon (PostgreSQL)
- npm ou yarn

## ⚙️ Instalação

1. **Clone o repositório**
\`\`\`bash
git clone <seu-repositorio>
cd real-sales-crm
\`\`\`

2. **Instale as dependências**
\`\`\`bash
npm install
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
\`\`\`

3. **Configure as variáveis de ambiente**
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edite o `.env.local` com suas configurações:
\`\`\`env
DATABASE_URL="sua-url-do-neon"
JWT_SECRET="sua-chave-jwt-de-64-caracteres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-nextauth"
\`\`\`

4. **Configure o banco de dados**

No painel do Neon, execute os scripts SQL na ordem:
- `scripts/001-create-database-schema.sql`
- `scripts/002-seed-initial-data.sql`

5. **Execute o projeto**
\`\`\`bash
npm run dev
\`\`\`

Acesse: http://localhost:3000

## 🔐 Login Padrão

- **Email**: admin@realsales.com
- **Senha**: admin123

## 📁 Estrutura do Projeto

\`\`\`
├── app/
│   ├── api/                 # API Routes
│   ├── dashboard/           # Dashboard principal
│   ├── clients/            # Gestão de clientes
│   ├── tasks/              # Sistema de tarefas
│   ├── properties/         # Catálogo de propriedades
│   ├── pipeline/           # Pipeline de vendas
│   └── login/              # Página de login
├── components/             # Componentes React
├── contexts/              # Context API
├── lib/                   # Utilitários e configurações
└── scripts/               # Scripts SQL
\`\`\`

## 🔧 Scripts Disponíveis

- `npm run dev` - Executa em modo desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Executa build de produção
- `npm run lint` - Executa linting

## 📊 Funcionalidades Detalhadas

### Dashboard
- Métricas de vendas e clientes
- Gráficos de performance
- Tarefas pendentes
- Atividades recentes

### Gestão de Clientes
- CRUD completo de clientes
- Sistema de notas
- Histórico de interações
- Status e categorização

### Sistema de Tarefas
- Criação e atribuição de tarefas
- Prioridades (baixa, média, alta)
- Prazos e lembretes
- Status de progresso

### Propriedades
- Catálogo completo de imóveis
- Filtros avançados
- Upload de images
- Status de disponibilidade

### Pipeline de Vendas
- Visualização em kanban
- Estágios personalizáveis
- Arrastar e soltar
- Métricas de conversão

## 🔒 Segurança

- Autenticação JWT
- Senhas criptografadas com bcrypt
- Validação de dados
- Proteção de rotas

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório no Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Outras Plataformas

O projeto é compatível com qualquer plataforma que suporte Next.js.

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas e suporte, abra uma issue no repositório.
