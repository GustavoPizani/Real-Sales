---
name: creative-fatigue-detection
description: Detecta sinais precoces de fadiga em anúncios Meta antes que a performance colapse. Analisa decay de CTR, acúmulo de frequência e aumento de CPM por anúncio. Categoriza como urgente (trocar agora), atenção (1-2 semanas) ou saudável.
---

# Creative Fatigue Detection — Meta Ads

## Coleta de Dados (usar ferramentas MCP)

1. `get_campaign_summary` (group_by: "ad", últimos 21 dias) — visão geral por anúncio
2. `get_campaign_trend` para os anúncios com CPL mais alto — evolução diária
3. `compare_periods` — últimos 7 dias vs 7 dias anteriores por campanha

## Critérios de Classificação

### 🔴 URGENTE — Trocar agora
- CTR caiu >25% nos últimos 7 dias E CPL >40% acima da média
- CPL >2x a média histórica por 3+ dias consecutivos
- Clicks próximos de zero nos últimos 3 dias

### 🟡 ATENÇÃO — Monitorar (1-2 semanas)
- CTR caindo 10-25% nos últimos 7 dias
- CPL entre 1.3x e 2x a média
- Tendência de queda por 5+ dias

### 🟢 SAUDÁVEL — Manter
- CTR estável ou crescendo
- CPL dentro da meta ou abaixo
- Sem tendência de degradação nos últimos 7 dias

## Análise de Tendência

Para cada anúncio com dados de trend:
```
Dia 1-7:  CPL médio = R$[X]
Dia 8-14: CPL médio = R$[X]  → variação: [X]%
Dia 15-21: CPL médio = R$[X] → variação: [X]%
```
Queda consistente por 3+ semanas = fadiga confirmada.

## Formato de Saída

```
## Relatório de Fadiga Criativa — [Período]

### 🔴 Urgente — Substituir Imediatamente
| Anúncio | Campanha | CPL Atual | CPL Base | Tendência |
|---------|----------|-----------|----------|-----------|

### 🟡 Atenção — Preparar Substitutos
| Anúncio | Campanha | Dias Restantes Est. | Sinal |

### 🟢 Saudável — Manter
| Anúncio | Campanha | CPL | Status |

### Recomendações
- Quantos criativos novos preparar: [N]
- Campanhas prioritárias para refresh: [lista]
- Estimativa de CPL se nada for feito: R$[X] em [N] semanas
```

## Diretrizes

- Analise no mínimo 14-21 dias para detectar tendências reais vs ruído
- Um dia ruim não é fadiga — procure padrões de 5+ dias
- Lembre que escala de budget acelera fadiga (mais impressões = frequência sobe mais rápido)
