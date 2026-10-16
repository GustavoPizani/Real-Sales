---
name: meta-ads-audit
description: Auditoria completa de campanhas Meta Ads usando dados reais do banco. Detecta fadiga criativa, sobreposição de públicos, oportunidades de escala e problemas de tracking. Use quando quiser analisar a saúde da conta, antes de reuniões de performance, ou ao identificar quedas de resultado.
---

# Meta Ads Audit — Dados Reais

Antes de iniciar a análise, busque os dados reais via MCP:

## Coleta de Dados (usar ferramentas MCP)

1. Busque o resumo geral do período com `get_overall_stats` (últimos 30 dias)
2. Busque o resumo por campanha com `get_campaign_summary` (group_by: "campaign")
3. Busque o resumo por anúncio com `get_campaign_summary` (group_by: "ad")
4. Identifique as piores campanhas com `get_top_campaigns` (metric: "cpl_desc")
5. Compare com o período anterior com `compare_periods`

## Análise de Fadiga Criativa

Com os dados de anúncios por dia (group_by: "ad"), avalie:

| Sinal | Limiar | Ação |
|-------|--------|------|
| CTR em queda | >15-20% em 7 dias | Novo criativo necessário |
| CPM subindo | >30-40% em 2 semanas | Reset de criativo |
| CPL alto vs média | >50% acima da média | Pausar e substituir |

## Análise de Performance por Campanha

Classifique cada campanha como:
- **Escalar**: CPL abaixo da meta, leads crescendo
- **Manter**: Performance estável dentro da meta
- **Otimizar**: CPL acima da meta mas com potencial
- **Pausar**: CPL muito alto, sem conversões, budget desperdiçado

## Formato de Saída

```
## Auditoria Meta Ads — [Período]

**Health Score**: [X/100]
**Investimento Total**: R$[X]
**CPL Médio**: R$[X]
**Total de Leads**: [X]

### 🔴 Alertas Críticos
[campanhas com CPL >2x a média ou zero leads]

### 🟡 Campanhas para Otimizar
[campanhas acima da meta mas com potencial]

### 🟢 Campanhas para Escalar
[campanhas com CPL baixo e leads crescendo]

### 📊 Comparação com Período Anterior
[variação % de cada métrica chave]

### Próximos Passos Prioritários
1. [ação específica com campanha e impacto esperado]
```

## Diretrizes

- Sempre analise no mínimo 14 dias para tendências confiáveis
- Compare dois períodos equivalentes (semana vs semana anterior, mês vs mês anterior)
- Priorize ações pelo impacto no CPL e volume de leads
- Se os dados mostrarem anomalias (picos únicos), contextualize antes de concluir
