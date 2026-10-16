---
name: cpa-diagnostics
description: Diagnóstico quando o CPL/CPA dispara. Isola os fatores que causaram a alta — fadiga criativa, mudança de leilão, degradação de público, problemas de landing page — e ranqueia por contribuição percentual. Use quando o CPL subir mais de 15-20% semana a semana.
---

# CPL Diagnostics — Meta Ads

## Coleta de Dados (usar ferramentas MCP)

1. `get_overall_stats` — período atual e período anterior (mesma duração)
2. `compare_periods` — variação % entre os dois períodos
3. `get_top_campaigns` (metric: "cpl_desc") — campanhas com maior CPL
4. `get_campaign_trend` — evolução diária das campanhas suspeitas
5. `get_campaign_summary` (group_by: "ad") — performance por anúncio

## Framework de Diagnóstico

### Nível 1: Onde está o problema?
Compare spend vs leads por campanha entre os dois períodos:
- **Spend igual, leads caindo** → problema de conversão (criativo ou landing page)
- **Spend subindo, leads proporcional** → budget scale normal
- **Spend igual, CPL subiu** → competição de leilão ou fadiga

### Nível 2: Qual campanha contribui mais?
Calcule: `(CPL_atual - CPL_anterior) × leads_atuais = impacto_absoluto`

Ranqueie por impacto absoluto — essa é a ordem de prioridade para corrigir.

### Nível 3: Identifique a causa raiz
| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| CTR caindo + frequência alta | Fadiga criativa | Novos criativos |
| CPM subindo sem mudança de CTR | Concorrência no leilão | Revisar lances ou públicos |
| CTR estável, CVR caindo | Landing page ou oferta | Revisar LP ou formulário |
| Resultado concentrado em poucos anúncios | Distribuição do budget | Rebalancear ad sets |

## Formato de Saída

```
## Diagnóstico CPL — [Período A] vs [Período B]

**CPL atual**: R$[X] | **CPL anterior**: R$[X] | **Variação**: +[X]%

### Fatores identificados (ranqueados por impacto)

1. **[Campanha/Ad Set X]** — contribuição: [X]% do aumento
   - Causa: [fadiga/leilão/LP]
   - Ação: [ação específica]

2. **[Campanha Y]** — contribuição: [X]%
   ...

### Recomendações por prioridade
1. [Ação imediata — impacto alto]
2. [Ação esta semana — impacto médio]
3. [Monitorar — baixo impacto]
```
