---
name: budget-scenario-planner
description: Modela o que acontece com CPL, ROAS e volume de leads ao aumentar ou cortar budget. Usa dados reais das campanhas para projetar a curva de retornos decrescentes. Use antes de reuniões de budget, ao receber pedido de escala do cliente, ou para decidir onde alocar verba adicional.
---

# Budget Scenario Planner — Meta Ads

## Coleta de Dados (usar ferramentas MCP)

1. `get_campaign_summary` (últimos 60-90 dias) — baseline de eficiência por campanha
2. `get_overall_stats` — totais consolidados do período
3. `compare_periods` — últimos 30 dias vs 30 dias anteriores (detectar saturação)
4. `get_top_campaigns` (metric: "leads") — campanhas com melhor escala

## Análise de Curva de Eficiência

Para cada campanha, calcule:
- **Eficiência atual**: `leads / spend` (leads por real investido)
- **CPL médio**: `spend / leads`
- **Headroom estimado**: quanto pode crescer antes de o CPL explodir

### Sinais de Saturação (limitador de escala)
- CPL subindo mês a mês mesmo sem mudanças → público saturando
- Frequência alta (estimada pelo baixo CTR) → criativo fadigado
- CPM subindo sem melhora de resultado → concorrência no leilão

## Framework de Cenários

Para cada cenário de budget, estime:

| Budget | Leads Projetados | CPL Projetado | Justificativa |
|--------|-----------------|---------------|---------------|
| Atual (baseline) | [X] | R$[X] | Dados reais |
| +20% | [X] | R$[X] | Estimativa conservadora |
| +50% | [X] | R$[X] | Risco de saturação |
| +100% | [X] | R$[X] | Requer novos públicos |

**Regra de ouro**: Para cada +10% de budget, CPL tende a subir 3-8% por retornos decrescentes. Acima de +50% sem expansão de público, CPL pode subir 15-30%.

## Recomendação de Alocação

Priorize campanhas na ordem:
1. **CPL mais baixo** → escalar primeiro (melhor eficiência marginal)
2. **CPL médio** → escalar com cautela e novos criativos
3. **CPL alto** → não escalar, otimizar antes

## Formato de Saída

```
## Simulação de Budget — [Data]

**Budget atual**: R$[X]/mês
**Leads atuais**: [X]/mês
**CPL atual**: R$[X]

### Cenários Projetados

| Cenário | Budget Mensal | Leads Est. | CPL Est. | Recomendação |
|---------|--------------|------------|----------|--------------|
| Conservador +20% | R$[X] | [X] | R$[X] | ✅ Viável |
| Moderado +50% | R$[X] | [X] | R$[X] | ⚠️ Cuidado |
| Agressivo +100% | R$[X] | [X] | R$[X] | ❌ Risco alto |

### Alocação Recomendada (+[X]% de verba)
- Campanha A: +R$[X] (menor CPL, mais headroom)
- Campanha B: +R$[X] (estável, testar escala)
- Campanha C: R$0 (otimizar antes de escalar)

### Pré-requisitos antes de escalar
1. [ação necessária antes de investir mais]
```
