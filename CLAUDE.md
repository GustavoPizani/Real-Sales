# Real Sales CRM — Contexto do Projeto

## O que é esse projeto
CRM imobiliário com integração Meta Lead Ads, agentes SDR via WhatsApp (IA), e analytics de campanhas Meta Ads.

## Analytics de Campanhas Meta Ads

### MCP Server disponível: `meta-analytics`

Quando estiver em Claude Code dentro deste projeto, o servidor MCP `meta-analytics` está disponível com as seguintes ferramentas:

| Ferramenta | O que faz | Parâmetros obrigatórios |
|------------|-----------|------------------------|
| `get_overall_stats` | Stats consolidados do período | start_date, end_date |
| `get_campaign_summary` | Agrupado por campanha/ad_set/ad | start_date, end_date, group_by |
| `get_top_campaigns` | Melhores/piores por métrica | start_date, end_date, metric |
| `get_campaign_trend` | Evolução diária de uma campanha | campaign_name, start_date, end_date |
| `get_campaign_metrics` | Dados brutos dia a dia | start_date, end_date |
| `compare_periods` | Comparação entre dois períodos | period_a_start/end, period_b_start/end |

**Formato de data**: YYYY-MM-DD (ex: 2026-05-01)

**Métricas disponíveis** em `get_top_campaigns`:
- `leads` — mais leads
- `cpl_asc` — menor CPL (melhor)
- `cpl_desc` — maior CPL (pior)
- `ctr` — maior CTR
- `clicks` — mais clicks
- `spend` — maior investimento

### Skills de análise disponíveis

Invoque com `/nome-da-skill`:

- `/meta-ads-audit` — Auditoria completa da conta
- `/cpa-diagnostics` — Diagnóstico quando CPL sobe
- `/creative-fatigue-detection` — Detecta anúncios em fadiga
- `/budget-scenario-planner` — Simula cenários de escala de budget
- `/weekly-account-summary` — Resumo semanal de performance

### Fluxo de uso típico

1. Usuário invoca uma skill (ex: `/meta-ads-audit`)
2. A skill instrui quais ferramentas MCP chamar e em qual ordem
3. Claude chama as ferramentas para buscar os dados reais
4. Claude aplica o framework de análise da skill nos dados retornados
5. Claude entrega o relatório formatado

### Exemplo de pergunta direta

Você pode fazer perguntas sem invocar uma skill explícita:
- "Quais campanhas tiveram melhor CPL nas últimas 2 semanas?"
- "Compare a performance de maio vs abril"
- "O que está causando o aumento do CPL essa semana?"
- "Quais campanhas devo pausar ou escalar agora?"

Nesses casos, use as ferramentas MCP para buscar os dados e responder com análise fundamentada nos números reais.

## Stack Tecnológico

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Banco**: PostgreSQL (Neon) via Prisma ORM
- **IA Agentes**: Groq (Llama 3 70B)
- **WhatsApp**: Waha API
- **Autenticação**: Clerk
- **Integrações**: Meta Lead Ads, Slack, Web Push

## Estrutura de Pastas Relevante

```
app/
  (marketing)/marketing/     # Sessão de marketing
    agents/                  # Agentes SDR
    integrations/            # Facebook Lead Ads
    settings/                # Chaves de API
    whatsapp/                # Conexão WhatsApp
  api/
    facebook/                # OAuth + webhook Meta
    sessions/                # API agentes SDR
lib/
  llm/                       # Integração Groq
  channels/                  # Waha WhatsApp
  lead-ingestion.ts          # Processamento de leads
mcp-meta-analytics/          # MCP Server analytics
  src/index.ts               # Ferramentas de análise
  dist/                      # Build compilado
```
