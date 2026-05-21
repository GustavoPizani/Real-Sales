# SDR AI Agent — Memorial Descritivo Técnico

## 1. Escopo e Arquitetura
O sistema implementado integra um Agente SDR autônomo diretamente no banco de dados e na aplicação Next.js do CRM **Real-Sales**. 
A arquitetura híbrida aproveita:
- **Painel & Webhooks**: Next.js 14 via Vercel Serverless.
- **Banco de Dados**: PostgreSQL via Supabase (com Prisma schema appending).
- **Fila & Coalesce**: Redis via Upstash (para debounce de 5 segundos).
- **Cérebro LLM**: Groq (modelo Llama 3 70B com geração ultrarrápida).
- **Motor WhatsApp**: Waha Core hospedado via Railway.

## 2. Modelagem de Dados
Seis novos modelos foram apensados ao `schema.prisma` original, sem afetar as tabelas nativas do CRM:
- `Contact` e `ContactIdentity`: Representam as identidades dos leads nos canais (ex: WhatsApp). A entidade `Contact` faz ponte direta com `Client` (nome atual da tabela de leads no CRM).
- `Conversation` e `Message`: Armazenam o histórico de interação, métricas de tokens e possuem trava contra múltiplas instâncias de IA.
- `AgentSession` e `AIRule`: Controlam as "personas" e os limites de automação (teto do funil).

## 3. Funcionalidades Core
- **Busca Global Antiduplicação**: O webhook `/api/webhooks/waha` extrai os 8 últimos dígitos numéricos do número do cliente no WhatsApp e efetua uma busca via sufixo (`endsWith`) na base existente do CRM (`Client.phone`).
- **Debounce Serverless Inteligente**: A API recebe mensagens disparadas individualmente por quebras de linha pelo usuário. O Upstash Redis e uma trava deslizante de 5 segundos (`waitUntil` na Vercel) aglomeram essas frações para consumir o LLM em um único request coeso.
- **Orquestração de Prompt Dinâmico**: O Groq é invocado com um System Prompt modular. O histórico (`window_20`) e o teto operacional (`qualificationBoundary`) são injetados para proibir a IA de continuar falando quando a qualificação alvo (ex: orçamento e bairro) for batida.

## 4. UI e Tematização
Uma nova árvore de configurações foi criada em `app/(app)/settings/agents`, alavancando os componentes originais `shadcn/ui` do CRM, mas incorporando a paleta dark theme e o acento *Alien Green* (`#adff2f`) para fácil distinção das áreas regidas pela IA.

## 5. Critérios de Aceite
- [x] Schema integrado e Prisma Client gerado com sucesso.
- [x] Painel de Criação/Edição de Agentes online e responsivo.
- [x] Healthcheck ativo e disponível na rota `/api/health`.
- [x] O Redis aglomera requisições consecutivas no mesmo ID no intervalo de 5s.
- [x] O motor Groq responde consistentemente em PT-BR respeitando a barreira do funil de qualificação.
