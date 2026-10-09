"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Info, Minus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIOD_PRESETS, type PeriodPreset } from "@/lib/dashboard-config";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import { FunnelBars, StatusGauge, TrendBars } from "./charts";
import { DASH_CARD, DASH_HERO, DASH_SURFACE, initialsOf } from "./ui";
import { KpiDetailDialog, type KpiDetailTarget } from "./kpi-detail";
import { formatBRL, formatPercent, percentOf, type AnalyticsData, type DashboardView } from "./types";

const ALL = "all";
const FIELD = `rounded-full ${DASH_SURFACE}`;
const MOSAIC_CARD = `min-w-0 flex-[1_1_20rem] ${DASH_CARD}`;
const CUSTOM = "custom";

type Basis = "event" | "cohort";
interface DateRange {
  from: string;
  to: string;
}

function presetRange(preset: PeriodPreset): DateRange {
  const today = new Date();
  const day = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "7d":
      return { from: day(subDays(today, 6)), to: day(today) };
    case "30d":
      return { from: day(subDays(today, 29)), to: day(today) };
    case "month":
      return { from: day(startOfMonth(today)), to: day(today) };
    case "last-month": {
      const last = subMonths(today, 1);
      return { from: day(startOfMonth(last)), to: day(endOfMonth(last)) };
    }
    case "year":
      return { from: day(startOfYear(today)), to: day(today) };
    default:
      return { from: day(subDays(today, 89)), to: day(today) };
  }
}

const HISTORY_MISSING_TEXT = {
  table: "A tabela de histórico de etapas não foi encontrada no banco: falta rodar o SQL da migration.",
  client: "O servidor ainda está com a versão antiga do banco em memória: pare o servidor, rode \"npx prisma generate\" e inicie de novo.",
  other: "Não foi possível ler o histórico de etapas (o motivo está no terminal do servidor).",
} as const;

const formatDay = (isoDay: string) => isoDay.split("-").reverse().join("/");

function KpiTile({
  label,
  value,
  hint,
  wide = false,
  hero = false,
  onClick,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  /** Cartão de destaque, em dourado. Um só por tela. */
  hero?: boolean;
  /** Ocupa a linha inteira no celular (valores longos, como o volume em reais). */
  wide?: boolean;
  onClick?: () => void;
}) {
  // Valores longos (volume em reais) usam um corpo menor para caber no cartão.
  const valueSize = value.length > 8 ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl";
  const subtle = hero ? "text-[#07090D]/75" : "text-muted-foreground";
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-medium leading-tight">{label}</span>
        {onClick && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${hero ? "border-[#07090D]/40" : "border-foreground/25"}`}>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className={`mt-auto block pt-4 font-semibold leading-none tracking-tight tabular-nums [overflow-wrap:anywhere] ${valueSize}`}>
        {value}
      </span>
      {hint && <span className={`mt-2 block text-xs ${subtle}`}>{hint}</span>}
    </>
  );
  const base = `flex min-h-[8.5rem] min-w-0 flex-col p-4 text-left sm:min-h-[10rem] sm:p-5 ${DASH_CARD} ${hero ? DASH_HERO : "text-foreground"} ${wide ? "col-span-2 xl:col-span-1" : ""}`;

  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. Ver clientes`}
      className={`${base} transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {body}
    </button>
  );
}

/**
 * Variação contra o período imediatamente anterior, de mesma duração.
 * Seta e sinal dizem a direção; a cor não muda, porque subir nem sempre é bom ou ruim.
 */
function Delta({ current, previous, format = (n: number) => n.toLocaleString("pt-BR") }: {
  current: number;
  previous: number;
  format?: (n: number) => string;
}) {
  if (previous === 0) {
    return <span className="block">{current === 0 ? "Igual ao período anterior" : "Nada no período anterior"}</span>;
  }
  const change = ((current - previous) / previous) * 100;
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <span className="flex items-center gap-1">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {change > 0 ? "+" : change < 0 ? "−" : ""}
        {formatPercent(Math.abs(change))} vs. anterior ({format(previous)})
      </span>
    </span>
  );
}

// Última resposta de cada combinação de filtros. Trocar de aba ou voltar à
// página mostra o que já se tinha na hora e atualiza por trás.
const responseCache = new Map<string, AnalyticsData>();

/** Chamado quando a configuração do dashboard muda: as respostas guardadas deixam de valer. */
export function clearAnalyticsCache() {
  responseCache.clear();
}

export function AnalyticsPanel({ view }: { view: DashboardView }) {
  // null = período padrão da configuração, que o servidor resolve.
  const [periodChoice, setPeriodChoice] = useState<PeriodPreset | typeof CUSTOM | null>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const [customDraft, setCustomDraft] = useState<DateRange>({ from: "", to: "" });
  const [basis, setBasis] = useState<Basis>("event");
  const [funnelId, setFunnelId] = useState(ALL);
  const [brokerId, setBrokerId] = useState(ALL);
  const [detail, setDetail] = useState<KpiDetailTarget | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (range) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    if (basis === "cohort") params.set("basis", "cohort");
    if (funnelId !== ALL) params.set("funnelId", funnelId);
    if (brokerId !== ALL) params.set("brokerId", brokerId);
    return params.toString();
  }, [range, basis, funnelId, brokerId]);

  const [data, setData] = useState<AnalyticsData | null>(() => responseCache.get(query) ?? null);
  const [isLoading, setIsLoading] = useState(!responseCache.has(query));
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    const cached = responseCache.get(query);
    if (cached) setData(cached);
    setIsLoading(!cached);
    setHasError(false);
    try {
      const res = await dashboardFetch(`/api/dashboard/analytics?${query}`);
      if (!res.ok) throw new Error();
      const fresh: AnalyticsData = await res.json();
      responseCache.set(query, fresh);
      setData(fresh);
    } catch {
      // Com dados antigos na tela, uma falha ao atualizar não apaga o que já está visível.
      if (!cached) setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePeriodChange = (value: string) => {
    if (value === CUSTOM) {
      // Só passa a valer ao clicar em Aplicar; parte do período que está na tela.
      setCustomDraft(range ?? data?.range ?? presetRange("90d"));
      setPeriodChoice(CUSTOM);
      return;
    }
    setPeriodChoice(value as PeriodPreset);
    setRange(presetRange(value as PeriodPreset));
  };

  const customInvalid = !customDraft.from || !customDraft.to || customDraft.from > customDraft.to;
  const period = periodChoice ?? data?.defaultPeriod;
  const showBrokerFilter = view !== "broker" && (data?.brokers.length ?? 0) > 1;
  const widgets = data?.widgets;
  const leads = data?.kpis.leads ?? 0;
  const isEvent = data?.basis === "event";
  // Pela data de entrada, quem entrou antes teve mais tempo para avançar: comparar
  // etapas e vendas com o período anterior daria sempre vantagem ao mais antigo.
  // Nesse modo só as entradas são comparadas.
  const compareAll = isEvent;
  // O histórico real começou depois do início do período: parte das datas é aproximada.
  const historyApproximate = isEvent && (!data?.historySince || data.range.from < data.historySince);
  // 3 indicadores fixos + etapas: com total ímpar, o volume ocupa a linha inteira no celular.
  const volumeWide = ((data?.steps.length ?? 0) + 3) % 2 === 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="min-w-0 space-y-1 sm:w-48">
          <label htmlFor="analytics-period" className="text-xs font-medium text-muted-foreground">Período</label>
          <Select value={period ?? ""} onValueChange={handlePeriodChange}>
            <SelectTrigger id="analytics-period" className={FIELD}><SelectValue placeholder="Carregando..." /></SelectTrigger>
            <SelectContent>
              {PERIOD_PRESETS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              <SelectItem value={CUSTOM}>Datas personalizadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1 sm:w-56">
          <label htmlFor="analytics-basis" className="text-xs font-medium text-muted-foreground">Contar por</label>
          <Select value={basis} onValueChange={v => setBasis(v as Basis)}>
            <SelectTrigger id="analytics-basis" className={FIELD}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="event">Data em que aconteceu</SelectItem>
              <SelectItem value="cohort">Data de entrada do cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1 sm:w-56">
          <label htmlFor="analytics-funnel" className="text-xs font-medium text-muted-foreground">Funil</label>
          <Select value={funnelId} onValueChange={setFunnelId}>
            <SelectTrigger id="analytics-funnel" className={FIELD}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os funis</SelectItem>
              {(data?.funnels ?? []).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {showBrokerFilter && (
          <div className="min-w-0 space-y-1 sm:w-56">
            <label htmlFor="analytics-broker" className="text-xs font-medium text-muted-foreground">Corretor</label>
            <Select value={brokerId} onValueChange={setBrokerId}>
              <SelectTrigger id="analytics-broker" className={FIELD}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{view === "manager" ? "Toda a equipe" : "Todos os corretores"}</SelectItem>
                {data!.brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {periodChoice === CUSTOM && (
          <form
            className="col-span-2 grid grid-cols-2 gap-3 sm:flex sm:w-full sm:items-end"
            onSubmit={e => { e.preventDefault(); if (!customInvalid) setRange(customDraft); }}
          >
            <div className="min-w-0 space-y-1 sm:w-44">
              <label htmlFor="analytics-from" className="text-xs font-medium text-muted-foreground">De</label>
              <Input id="analytics-from" type="date" className={FIELD} value={customDraft.from} max={customDraft.to || undefined} onChange={e => setCustomDraft(d => ({ ...d, from: e.target.value }))} />
            </div>
            <div className="min-w-0 space-y-1 sm:w-44">
              <label htmlFor="analytics-to" className="text-xs font-medium text-muted-foreground">Até</label>
              <Input id="analytics-to" type="date" className={FIELD} value={customDraft.to} min={customDraft.from || undefined} onChange={e => setCustomDraft(d => ({ ...d, to: e.target.value }))} />
            </div>
            <Button type="submit" className="col-span-2 rounded-full sm:col-span-1" disabled={customInvalid}>Aplicar</Button>
            {customDraft.from && customDraft.to && customDraft.from > customDraft.to && (
              <p role="alert" className="col-span-2 text-sm text-destructive sm:w-full">A data inicial precisa ser anterior à final.</p>
            )}
          </form>
        )}
      </div>

      {hasError ? (
        <Card className={DASH_CARD}>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Não foi possível carregar as análises.</p>
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Tentar de novo</Button>
          </CardContent>
        </Card>
      ) : isLoading && !data ? (
        <div className="space-y-6" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-[20px]" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-[20px]" />
        </div>
      ) : data && widgets ? (
        <div className={`space-y-6 transition-opacity ${isLoading ? "opacity-60" : ""}`} aria-busy={isLoading}>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              {formatDay(data.range.from)} a {formatDay(data.range.to)}.{" "}
              {isEvent
                ? "Cada número conta o que aconteceu no período: cadastros, chegada a cada etapa e vendas."
                : "Base: clientes que entraram no período. Cada etapa conta quem hoje está na coluna ligada a ela, em uma depois, ou já foi ganho."}
            </p>
            {data.historyMissing && (
              <p className="flex items-start gap-2 rounded-2xl border border-border bg-muted p-3 text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {HISTORY_MISSING_TEXT[data.historyMissing]} Enquanto isso, os números estão pela data de entrada do cliente.
              </p>
            )}
            {historyApproximate && (
              <p className="flex items-start gap-2 rounded-2xl border border-border bg-muted p-3 text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {data.historySince
                  ? `O histórico de etapas começou em ${formatDay(data.historySince)}. Para o que aconteceu antes, a data usada é a da última atualização do cliente.`
                  : "Ainda não há mudanças de etapa registradas. As datas usadas são as da última atualização de cada cliente."}
              </p>
            )}
            {data.truncated && (
              <p className="flex items-start gap-2 text-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                O período tem clientes demais para somar de uma vez; os números são parciais. Escolha um período menor.
              </p>
            )}
          </div>

          {widgets.kpis && (
            <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
              <KpiTile
                label="Entraram"
                hero
                value={leads.toLocaleString("pt-BR")}
                hint={<Delta current={leads} previous={data.kpis.prevLeads} />}
                onClick={() => setDetail({ metric: "leads", title: "Entraram" })}
              />
              {data.steps.map(step => (
                <KpiTile
                  key={step.id}
                  label={step.label}
                  value={step.count === null ? "—" : step.count.toLocaleString("pt-BR")}
                  hint={step.count === null ? "Sem coluna do pipeline ligada" : (
                    <>
                      <span className="block">{percentOf(step.count, leads)} das entradas</span>
                      {compareAll && step.prevCount !== null && <Delta current={step.count} previous={step.prevCount} />}
                    </>
                  )}
                  onClick={step.count === null ? undefined : () => setDetail({ metric: `step:${step.id}`, title: step.label })}
                />
              ))}
              <KpiTile
                label="Vendas"
                value={data.kpis.won.toLocaleString("pt-BR")}
                hint={
                  <>
                    <span className="block">{percentOf(data.kpis.won, leads)} das entradas</span>
                    {compareAll && <Delta current={data.kpis.won} previous={data.kpis.prevWon} />}
                  </>
                }
                onClick={() => setDetail({ metric: "won", title: "Vendas" })}
              />
              <KpiTile
                label="Volume vendido"
                value={formatBRL(data.kpis.volume)}
                hint={compareAll
                  ? <Delta current={data.kpis.volume} previous={data.kpis.prevVolume} format={formatBRL} />
                  : `Das entradas: ${data.kpis.active} em andamento · ${data.kpis.lost} perdidos`}
                wide={volumeWide}
                onClick={() => setDetail({ metric: "won", title: "Vendas" })}
              />
            </div>
          )}

          {/* Mosaico de gráficos: os cartões quebram de linha sozinhos e os da última linha esticam para não sobrar buraco. */}
          {(widgets.trend || widgets.conversion || widgets.status || widgets.stages) && (
            <div className="flex flex-wrap gap-3 lg:gap-4">
              {widgets.trend && (
                <Card className={MOSAIC_CARD}>
                  <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Entradas no período</CardTitle></CardHeader>
                  <CardContent>
                    <TrendBars data={data.trend} dataKey="leads" noun="entradas" emptyText="Nenhum cliente entrou no período." />
                  </CardContent>
                </Card>
              )}
              {widgets.conversion && (
                <Card className={MOSAIC_CARD}>
                  <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Funil de conversão</CardTitle></CardHeader>
                  <CardContent>
                    <FunnelBars
                      steps={[
                        { name: "Entraram", count: leads },
                        ...data.steps.filter(s => s.count !== null).map(s => ({ name: s.label, count: s.count as number })),
                        { name: "Vendas", count: data.kpis.won },
                      ]}
                      emptyText="Nada aconteceu no período."
                    />
                  </CardContent>
                </Card>
              )}
              {widgets.status && (
                <Card className={MOSAIC_CARD}>
                  <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Situação de quem entrou</CardTitle></CardHeader>
                  <CardContent>
                    <StatusGauge
                      won={Math.max(leads - data.kpis.active - data.kpis.lost, 0)}
                      active={data.kpis.active}
                      lost={data.kpis.lost}
                    />
                  </CardContent>
                </Card>
              )}
              {widgets.stages && (
                <Card className={MOSAIC_CARD}>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium tracking-tight">
                      Onde estão hoje os que entraram{data.stagesFunnelName ? `: ${data.stagesFunnelName}` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FunnelBars steps={data.stageSteps} emptyText="Nenhum cliente entrou neste funil no período." />
                  </CardContent>
                </Card>
              )}
              {widgets.trend && (
                <Card className={MOSAIC_CARD}>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium tracking-tight">{isEvent ? "Vendas no período" : "Vendas, pela data de entrada do cliente"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TrendBars data={data.trend} dataKey="won" noun="vendas" emptyText="Nenhuma venda no período." />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {widgets.brokers && view !== "broker" && (
            <Card className={DASH_CARD}>
              <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Desempenho por corretor</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corretor</TableHead>
                      <TableHead className="text-right">Entraram</TableHead>
                      {data.steps.map(s => <TableHead key={s.id} className="whitespace-nowrap text-right">{s.label}</TableHead>)}
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Volume</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Tarefas atrasadas</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Parados há {data.staleDays}+ dias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byBroker.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          <span className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground" aria-hidden="true">{initialsOf(b.name)}</span>
                            {b.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{b.leads}</TableCell>
                        {data.steps.map((s, i) => (
                          <TableCell key={s.id} className="text-right tabular-nums">{s.count === null ? "—" : b.steps[i]}</TableCell>
                        ))}
                        <TableCell className="text-right tabular-nums">{b.won}</TableCell>
                        <TableCell className="text-right tabular-nums">{percentOf(b.won, b.leads)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatBRL(b.volume)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.overdueTasks > 0 ? (
                            <span className="inline-flex items-center gap-1 font-medium text-destructive">
                              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{b.overdueTasks}
                            </span>
                          ) : 0}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{b.staleClients}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {widgets.sources && view === "admin" && (
            <Card className={DASH_CARD}>
              <CardHeader><CardTitle className="text-lg font-medium tracking-tight">Campanhas</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                {data.bySource.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nada aconteceu no período.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-right">Entraram</TableHead>
                        {data.steps.map(s => <TableHead key={s.id} className="whitespace-nowrap text-right">{s.label}</TableHead>)}
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Conversão</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.bySource.map(s => (
                        <TableRow key={s.name}>
                          <TableCell className="max-w-xs truncate font-medium" title={s.name}>{s.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.leads}</TableCell>
                          {data.steps.map((step, i) => (
                            <TableCell key={step.id} className="text-right tabular-nums">{step.count === null ? "—" : s.steps[i]}</TableCell>
                          ))}
                          <TableCell className="text-right tabular-nums">{s.won}</TableCell>
                          <TableCell className="text-right tabular-nums">{percentOf(s.won, s.leads)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{formatBRL(s.volume)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      <KpiDetailDialog target={detail} query={query} showBroker={view !== "broker"} onClose={() => setDetail(null)} />
    </div>
  );
}
