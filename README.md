# Real Sales CRM

Sistema de CRM completo para empresas imobiliárias, desenvolvido com Next.js 14, TypeScript e Neon Database.

## 🚀 Funcionalidades

- **Dashboard Completo**: Métricas e KPIs em tempo real
- **Gestão de Clientes**: CRUD completo com histórico de interações
- **Pipeline de Vendas**: Kanban board com drag & drop
- **Gestão de Propriedades**: Catálogo completo de imóveis
- **Sistema de Tarefas**: Organização e acompanhamento de atividades
- **Gestão de Leads**: Captura e conversão de leads
- **Autenticação Segura**: JWT + cookies httpOnly
- **Responsive Design**: Interface adaptável para todos os dispositivos

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Neon (PostgreSQL)
- **Authentication**: JWT + bcryptjs
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Drag & Drop**: @hello-pangea/dnd

## 📦 Instalação

1. **Clone o repositório**:
\`\`\`bash
git clone https://github.com/GustavoPizani/Real-sales.git
cd Real-sales
\`\`\`

2. **Instale as dependências**:
\`\`\`bash
npm install
\`\`\`

3. **Configure as variáveis de ambiente**:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edite o `.env.local` com suas configurações:
\`\`\`env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
\`\`\`

4. **Configure o banco de dados**:
- Crie uma conta no [Neon](https://neon.tech)
- Execute os scripts SQL em `scripts/`

5. **Execute o projeto**:
\`\`\`bash
npm run dev
\`\`\`

## 🗄️ Estrutura do Banco

O sistema utiliza as seguintes tabelas principais:

- `users` - Usuários do sistema
- `clients` - Clientes e prospects
- `properties` - Propriedades/imóveis
- `tasks` - Tarefas e atividades
- `leads` - Leads capturados
- `client_notes` - Notas dos clientes

## 🔐 Autenticação

O sistema utiliza JWT tokens com cookies httpOnly para autenticação segura:

- **Login**: `POST /api/auth/login`
- **Logout**: Remoção do cookie
- **Proteção**: Middleware automático nas rotas protegidas

## 📱 API Endpoints

### Clientes
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Criar cliente
- `GET /api/clients/[id]` - Buscar cliente
- `PUT /api/clients/[id]` - Atualizar cliente
- `DELETE /api/clients/[id]` - Deletar cliente

### Propriedades
- `GET /api/properties` - Listar propriedades
- `POST /api/properties` - Criar propriedade
- `GET /api/properties/[id]` - Buscar propriedade
- `PUT /api/properties/[id]` - Atualizar propriedade

### Tarefas
- `GET /api/tasks` - Listar tarefas
- `POST /api/tasks` - Criar tarefa
- `PUT /api/tasks/[id]` - Atualizar tarefa
- `DELETE /api/tasks/[id]` - Deletar tarefa

### Leads
- `GET /api/leads` - Listar leads
- `POST /api/leads` - Criar lead
- `POST /api/leads/[id]/convert` - Converter lead em cliente

## 🚀 Deploy

### Vercel (Recomendado)

1. **Conecte o repositório** na Vercel
2. **Configure as variáveis de ambiente**:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
3. **Deploy automático** a cada push

### Outras Plataformas

O projeto é compatível com qualquer plataforma que suporte Next.js:
- Railway
- Render
- AWS Amplify
- Netlify

## 🔧 Desenvolvimento

### Scripts Disponíveis

\`\`\`bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Linting
npm run type-check   # Verificação de tipos
\`\`\`

### Estrutura de Pastas

\`\`\`
├── app/                 # App Router (Next.js 14)
│   ├── api/            # API Routes
│   ├── (dashboard)/    # Páginas do dashboard
│   └── globals.css     # Estilos globais
├── components/         # Componentes React
│   ├── ui/            # Componentes base (shadcn/ui)
│   └── ...            # Componentes específicos
├── lib/               # Utilitários e configurações
│   ├── db.ts          # Conexão com banco
│   ├── auth.ts        # Autenticação
│   └── utils.ts       # Funções utilitárias
├── scripts/           # Scripts SQL
└── types/             # Definições TypeScript
\`\`\`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte, entre em contato:
- Email: pizani@realsales.com.br
- GitHub Issues: [Criar Issue](https://github.com/GustavoPizani/Real-sales/issues)

---

Desenvolvido com ❤️ por [Gustavo Pizani](https://github.com/GustavoPizani)
