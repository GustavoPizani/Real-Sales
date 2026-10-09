"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeriesBars } from "@/components/dashboard/charts";
import { DASH_CARD, DASH_HERO } from "@/components/dashboard/ui";
import type { CampaignRow } from "@/hooks/marketing/useDashboardData";

interface DailyPoint {
  date: string;
  spend: number;
  leads: number;
}

const formatBRL = (value: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
// Valor escrito dentro de cada coluna do gráfico: sem "R$" e abreviado ("342", "1,2 mil"),
// porque a coluna é estreita. O valor completo está no resumo e no balão.
const formatBRLShort = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: value >= 1000 ? 1 : 0 }).format(value);
const formatInt = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));
const formatPercent = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function totalsOf(rows: CampaignRow[]) {
  const t = rows.reduce(
    (acc, row) => ({
      spend: acc.spend + row.spend,
      leads: acc.leads + row.leads,
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      reach: acc.reach + row.reach,
    }),
    { spend: 0, leads: 0, clicks: 0, impressions: 0, reach: 0 },
  );
  return {
    ...t,
    cpl: t.leads > 0 ? t.spend / t.leads : 0,
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
    cpc: t.clicks > 0 ? t.spend / t.clicks : 0,
    cpm: t.impressions > 0 ? (t.spend / t.impressions) * 1000 : 0,
    frequency: t.reach > 0 ? t.impressions / t.reach : 0,
  };
}

/**
 * Variação contra o período imediatamente anterior, de mesma duração.
 * Seta e sinal dizem a direção; a cor não muda, porque subir nem sempre é bom
 * (investimento e CPL subindo não são boa notícia).
 */
function Delta({ current, previous, format }: { current: number; previous: number; format: (n: number) => string }) {
  if (previous === 0) return <span>Sem dados no período anterior</span>;
  const change = ((current - previous) / previous) * 100;
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <span className="flex items-center gap-1">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>
        {change > 0 ? "+" : change < 0 ? "−" : ""}
        {formatPercent(Math.abs(change))} vs. anterior ({format(previous)})
      </span>
    </span>
  );
}

function MainStat({ label, value, hint, hero = false }: { label: string; value: string; hint: React.ReactNode; hero?: boolean }) {
  return (
    <div className={`flex min-h-[9rem] min-w-0 flex-col p-4 sm:p-5 ${DASH_CARD} ${hero ? DASH_HERO : "text-foreground"}`}>
      <p className="text-[15px] font-medium leading-tight">{label}</p>
      <p className={`mt-auto pt-4 font-semibold leading-none tracking-tight tabular-nums [overflow-wrap:anywhere] ${value.length > 9 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}>
        {value}
      </p>
      <div className={`mt-2 text-xs ${hero ? "text-[#07090D]/75" : "text-muted-foreground"}`}>{hint}</div>
    </div>
  );
}

export const OverviewView = ({
  data = [],
  previousData = [],
  dailyData = [],
  isLoading = false,
}: {
  data?: CampaignRow[];
  previousData?: CampaignRow[];
  dailyData?: DailyPoint[];
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-[20px]" />)}
        </div>
        <Skeleton className="h-20 w-full rounded-[20px]" />
        <Skeleton className="h-64 w-full rounded-[20px]" />
      </div>
    );
  }

  const current = totalsOf(data);
  const previous = totalsOf(previousData);

  // "08/10" a partir de "2026-10-08", sem passar por Date (que leria como UTC e voltaria um dia).
  const dayLabel = (date: string) => String(date).slice(5, 10).split("-").reverse().join("/");
  const leadsSeries = dailyData.map(d => ({ label: dayLabel(d.date), value: d.leads }));
  const spendSeries = dailyData.map(d => ({ label: dayLabel(d.date), value: d.spend }));

  // Indicadores de apoio: ficam numa faixa só, sem disputar atenção com os três principais.
  const secondary = [
    { label: "Impressões", value: formatInt(current.impressions) },
    { label: "Alcance", value: formatInt(current.reach) },
    { label: "Frequência", value: current.frequency.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) },
    { label: "Cliques", value: formatInt(current.clicks) },
    { label: "CTR", value: formatPercent(current.ctr) },
    { label: "CPC", value: formatBRL(current.cpc) },
    { label: "CPM", value: formatBRL(current.cpm) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <MainStat
          label="Leads"
          hero
          value={formatInt(current.leads)}
          hint={<Delta current={current.leads} previous={previous.leads} format={formatInt} />}
        />
        <MainStat
          label="Investimento"
          value={formatBRL(current.spend, 0)}
          hint={<Delta current={current.spend} previous={previous.spend} format={n => formatBRL(n, 0)} />}
        />
        <MainStat
          label="Custo por lead"
          value={current.leads > 0 ? formatBRL(current.cpl) : "—"}
          hint={
            current.leads > 0 && previous.leads > 0
              ? <Delta current={current.cpl} previous={previous.cpl} format={formatBRL} />
              : <span>{current.leads > 0 ? "Sem leads no período anterior" : "Nenhum lead no período"}</span>
          }
        />
      </div>

      <dl className={`grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:grid-cols-4 sm:p-5 xl:grid-cols-7 ${DASH_CARD}`}>
        {secondary.map(item => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>

      {/* Leads e investimento em gráficos separados, com a mesma linha do tempo: medidas de escalas diferentes não dividem eixo. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <Card className={DASH_CARD}>
          <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Leads por dia</CardTitle></CardHeader>
          <CardContent>
            <SeriesBars data={leadsSeries} noun="leads" emptyText="Nenhum lead no período." />
          </CardContent>
        </Card>
        <Card className={DASH_CARD}>
          <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Investimento por dia (R$)</CardTitle></CardHeader>
          <CardContent>
            <SeriesBars
              data={spendSeries}
              noun="investidos"
              emptyText="Nenhum investimento no período."
              formatValue={n => formatBRL(n)}
              formatShort={formatBRLShort}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
