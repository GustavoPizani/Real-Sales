---
name: weekly-account-summary
description: Gera resumo semanal de performance Meta Ads com dados reais. Consolida investimento, leads, CPL, variações vs semana anterior e destaca destaques e alertas. Use toda segunda-feira para checar a semana anterior, ou antes de reportar para clientes.
---

# Weekly Account Summary — Meta Ads

## Coleta de Dados (usar ferramentas MCP)

Execute na seguinte ordem:
1. `get_overall_stats` — semana atual (últimos 7 dias)
2. `compare_periods` — semana atual vs semana anterior
3. `get_top_campaigns` (metric: "leads", top_n: 5) — melhores da semana
4. `get_top_campaigns` (metric: "cpl_desc", top_n: 3) — piores da semana
5. `get_campaign_summary` (group_by: "campaign") — visão geral de todas

## Estrutura do Resumo

Construa o relatório na seguinte ordem:

### 1. Headline Numbers
Invista vs semana anterior, leads gerados, CPL médio, variações %.

### 2. Destaque Positivo
A campanha/anúncio que mais se destacou — o que funcionou e por quê.

### 3. Alerta Principal
O maior problema da semana — campanha com CPL explodindo, queda de volume, etc.

### 4. Tabela de Campanhas
Todas as campanhas com: spend, leads, CPL, variação vs semana anterior.

### 5. Próximos Passos
3 ações concretas para a próxima semana baseadas nos dados.

## Formato de Saída

```
## Resumo Semanal Meta Ads — [Data início] a [Data fim]

### Números da Semana
| Métrica | Esta Semana | Semana Anterior | Variação |
|---------|------------|-----------------|----------|
| Investimento | R$[X] | R$[X] | [X]% |
| Leads | [X] | [X] | [X]% |
| CPL Médio | R$[X] | R$[X] | [X]% |
| Clicks | [X] | [X] | [X]% |

### ✅ Destaque da Semana
[campanha/anúncio que performou melhor e por quê]

### ⚠️ Alerta da Semana
[principal problema identificado]

### Performance por Campanha
| Campanha | Invest. | Leads | CPL | vs Semana Ant. |
|----------|---------|-------|-----|----------------|

### Próximos Passos
1. [ação concreta com campanha específica]
2. [ação concreta]
3. [ação concreta]
```
