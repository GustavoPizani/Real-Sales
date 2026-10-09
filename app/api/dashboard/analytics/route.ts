import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { resolveDashboardScope } from '@/lib/dashboard-scope';
import { loadFunnels, loadSavedDashboardConfig, resolveDashboardConfig } from '@/lib/dashboard-config.server';
import type { PeriodPreset } from '@/lib/dashboard-config';
import { ClientOverallStatus, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

// Datas do filtro são dias de calendário em São Paulo (UTC-3, sem horário de verão).
const SP_OFFSET = '-03:00';
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CLIENT_LIMIT = 20000;
const DETAIL_LIMIT = 500;
const STALE_DAYS = 7;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function parseDay(value: string | null, end: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}${SP_OFFSET}`);
  return isNaN(d.getTime()) ? null : d;
}

const spDay = (d: Date) => new Date(d.getTime() - SP_OFFSET_MS).toISOString().slice(0, 10);

/** Período padrão da configuração, em dias de calendário de São Paulo. */
function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const today = spDay(new Date());
  const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
  const [year, month] = today.split('-').map(Number);
  switch (preset) {
    case '7d':
      return { from: shift(-6), to: today };
    case '30d':
      return { from: shift(-29), to: today };
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case 'last-month': {
      const first = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
      const last = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
      return { from: first, to: last };
    }
    case 'year':
      return { from: `${year}-01-01`, to: today };
    default:
      return { from: shift(-89), to: today };
  }
}

const clientSelect = {
  id: true,
  fullName: true,
  brokerId: true,
  createdAt: true,
  overallStatus: true,
  funnelId: true,
  funnelStageId: true,
  campaignSource: true,
  saleDetails: { select: { saleValue: true } },
} satisfies Prisma.ClientSelect;

const clientWithEventsSelect = {
  ...clientSelect,
  stageEvents: {
    select: { funnelId: true, funnelStageId: true, overallStatus: true, occurredAt: true, effectiveAt: true },
    orderBy: { occurredAt: 'asc' },
  },
} satisfies Prisma.ClientSelect;

type ClientRow = Prisma.ClientGetPayload<{ select: typeof clientSelect }> & {
  stageEvents?: Prisma.ClientGetPayload<{ select: typeof clientWithEventsSelect }>['stageEvents'];
};

type Basis = 'event' | 'cohort';
type HistoryMissing = 'table' | 'client' | 'other';

/**
 * Busca os clientes do período.
 * - event: quem entrou no período OU teve mudança de etapa/status nele, com o histórico junto.
 * - cohort: só quem entrou no período.
 * Se a tabela de histórico ainda não existe no banco, o modo event cai para cohort.
 */
async function loadClients(
  where: Prisma.ClientWhereInput,
  from: Date,
  to: Date,
  wantEvent: boolean,
): Promise<{ basis: Basis; rows: ClientRow[]; historySince: Date | null; historyMissing: HistoryMissing | null }> {
  const range = { gte: from, lte: to };
  let historyMissing: HistoryMissing | null = null;

  if (wantEvent) {
    try {
      const [rows, firstRealEvent] = await Promise.all([
        prisma.client.findMany({
          where: {
            ...where,
            OR: [
              { createdAt: range },
              { stageEvents: { some: { OR: [{ occurredAt: range }, { effectiveAt: range }] } } },
            ],
          },
          select: clientWithEventsSelect,
          take: CLIENT_LIMIT,
        }),
        prisma.clientStageEvent.findFirst({
          where: { isBackfill: false },
          orderBy: { occurredAt: 'asc' },
          select: { occurredAt: true },
        }),
      ]);
      return { basis: 'event', rows, historySince: firstRealEvent?.occurredAt ?? null, historyMissing: null };
    } catch (error) {
      // P2021/P2022: a tabela ou uma coluna não existe no banco (SQL não rodado).
      // Erro de validação ou TypeError: o Prisma Client em memória é anterior ao
      // modelo novo (falta `prisma generate` + reiniciar o servidor).
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2021' || error.code === 'P2022')) {
        historyMissing = 'table';
      } else if (error instanceof Prisma.PrismaClientValidationError || error instanceof TypeError) {
        historyMissing = 'client';
      } else {
        historyMissing = 'other';
      }
      console.warn(`[dashboard] Histórico de etapas indisponível (${historyMissing}), usando data de entrada:`, error);
    }
  }

  const rows = await prisma.client.findMany({
    where: { ...where, createdAt: range },
    select: clientSelect,
    take: CLIENT_LIMIT,
  });
  return { basis: 'cohort', rows, historySince: null, historyMissing };
}

/**
 * Análises de conversão do dashboard.
 *
 * Dois modos (parâmetro `basis`):
 *
 * - event (padrão): cada número é contado pela data em que aconteceu. "Entraram"
 *   é quem foi cadastrado no período; cada etapa é quem chegou a ela no período
 *   (primeira vez que o cliente entrou na coluna ligada à etapa ou em uma
 *   depois dela); "Vendas" é quem foi ganho no período, pela data da venda
 *   informada ou, na falta, a data em que foi marcado como ganho. Depende do
 *   histórico em client_stage_events, gravado por trigger. O que aconteceu
 *   antes da instalação do histórico tem data aproximada (última atualização
 *   do cliente) — ver `historySince`.
 *
 * - cohort: a base são os clientes que entraram no período, e cada etapa
 *   conta quem, hoje, está na coluna ligada a ela, em uma depois, ou foi ganho.
 *
 * As etapas e as colunas ligadas a elas vêm da configuração do dashboard
 * (lib/dashboard-config.ts). Com `detail`, devolve a lista de clientes por
 * trás de um indicador em vez dos totais.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const [scope, funnels, savedConfig] = await Promise.all([
      resolveDashboardScope(user),
      loadFunnels(),
      loadSavedDashboardConfig(user),
    ]);
    const { config } = resolveDashboardConfig(savedConfig, funnels);

    // Sem datas na URL, vale o período padrão da configuração — assim a tela
    // não precisa buscar a configuração antes de pedir as análises.
    const explicitFrom = parseDay(params.get('from'), false);
    const explicitTo = parseDay(params.get('to'), true);
    const usesDefaultPeriod = !explicitFrom || !explicitTo;
    const fallback = presetRange(config.defaultPeriod);
    const from = usesDefaultPeriod ? parseDay(fallback.from, false)! : explicitFrom;
    const to = usesDefaultPeriod ? parseDay(fallback.to, true)! : explicitTo;
    if (from > to) return NextResponse.json({ error: 'Período inválido.' }, { status: 400 });

    const brokerParam = params.get('brokerId');
    const brokerIds = brokerParam && scope.brokerIds.includes(brokerParam) ? [brokerParam] : scope.brokerIds;
    const funnelParam = params.get('funnelId');
    const funnelFilter = funnelParam && funnels.some(f => f.id === funnelParam) ? funnelParam : null;
    const wantEvent = params.get('basis') !== 'cohort';
    const detail = params.get('detail');

    const baseWhere: Prisma.ClientWhereInput = {
      brokerId: { in: brokerIds },
      ...(funnelFilter && { funnelId: funnelFilter }),
    };

    const { basis, rows, historySince, historyMissing } = await loadClients(baseWhere, from, to, wantEvent);

    const stageOrder = new Map<string, number>();
    const stageName = new Map<string, string>();
    for (const f of funnels) {
      for (const s of f.stages) {
        stageOrder.set(s.id, s.order);
        stageName.set(s.id, s.name);
      }
    }

    const steps = config.steps;

    /** Ordem mínima que conta para a etapa de conversão `stepIndex` dentro de um funil. */
    const stepOrderIn = (stepIndex: number, funnelId: string) => {
      const stageId = steps[stepIndex].stageByFunnel[funnelId];
      return stageId ? stageOrder.get(stageId) : undefined;
    };

    const reachedNow = (c: ClientRow, order: number | undefined) => {
      if (order === undefined) return false;
      if (c.overallStatus === ClientOverallStatus.WON) return true;
      const current = stageOrder.get(c.funnelStageId);
      return current !== undefined && current >= order;
    };

    /**
     * Avalia cada cliente contra um período: entrou, chegou a cada etapa, vendeu.
     * Serve tanto para o período da tela quanto para o anterior, usado na comparação.
     */
    const evaluate = (clientRows: ClientRow[], rowsBasis: Basis, start: Date, end: Date, measurable?: boolean[]) => {
      const inRange = (d: Date) => d >= start && d <= end;
      return clientRows.map(c => {
      const events = c.stageEvents ?? [];
      if (measurable) {
        steps.forEach((_, i) => {
          if (stepOrderIn(i, c.funnelId) !== undefined) measurable[i] = true;
        });
      }

      if (rowsBasis === 'cohort') {
        return {
          client: c,
          entered: true,
          stepHit: steps.map((_, i) => reachedNow(c, stepOrderIn(i, c.funnelId))),
          stepDate: steps.map(() => null as Date | null),
          wonHit: c.overallStatus === ClientOverallStatus.WON,
          wonDate: null as Date | null,
        };
      }

      // Data em que o cliente chegou a cada etapa: o primeiro evento em que ele
      // estava na coluna ligada à etapa, em uma depois dela, ou ganho.
      const stepDate = steps.map((_, i) => {
        const first = events.find(ev => {
          if (ev.overallStatus === ClientOverallStatus.WON) return true;
          const needed = stepOrderIn(i, ev.funnelId);
          const current = stageOrder.get(ev.funnelStageId);
          return needed !== undefined && current !== undefined && current >= needed;
        });
        return first?.occurredAt ?? null;
      });

      // Data da venda: o evento em que o cliente passou a "ganho" pela última vez.
      let wonEvent: (typeof events)[number] | null = null;
      for (const ev of events) {
        if (ev.overallStatus !== ClientOverallStatus.WON) wonEvent = null;
        else if (!wonEvent) wonEvent = ev;
      }
      const wonDate =
        c.overallStatus === ClientOverallStatus.WON && wonEvent ? wonEvent.effectiveAt ?? wonEvent.occurredAt : null;

      return {
        client: c,
        entered: inRange(c.createdAt),
        stepHit: stepDate.map(d => d !== null && inRange(d)),
        stepDate,
        wonHit: wonDate !== null && inRange(wonDate),
        wonDate,
      };
      });
    };

    // Etapa sem coluna ligada em nenhum funil com clientes no período não tem como ser medida.
    const stepMeasurable = steps.map(() => false);
    const evaluated = evaluate(rows, basis, from, to, stepMeasurable);

    // Lista de clientes por trás de um indicador.
    if (detail) {
      const stepIndex = detail.startsWith('step:') ? steps.findIndex(s => s.id === detail.slice(5)) : -1;
      if (detail !== 'leads' && detail !== 'won' && stepIndex === -1) {
        return NextResponse.json({ error: 'Indicador desconhecido.' }, { status: 400 });
      }
      const brokerName = new Map(scope.brokers.map(b => [b.id, b.name]));
      const matches = evaluated
        .filter(e => (detail === 'leads' ? e.entered : detail === 'won' ? e.wonHit : e.stepHit[stepIndex]))
        .map(e => {
          const date = detail === 'leads' ? e.client.createdAt : detail === 'won' ? e.wonDate : e.stepDate[stepIndex];
          return {
            id: e.client.id,
            fullName: e.client.fullName,
            brokerName: brokerName.get(e.client.brokerId) ?? '—',
            stageName: stageName.get(e.client.funnelStageId) ?? '—',
            status: e.client.overallStatus,
            date: date ? date.toISOString() : null,
            value: detail === 'won' ? e.client.saleDetails?.saleValue ?? 0 : null,
          };
        })
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.fullName.localeCompare(b.fullName));

      return NextResponse.json({ basis, total: matches.length, clients: matches.slice(0, DETAIL_LIMIT) });
    }

    const rangeMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - rangeMs);
    const now = new Date();

    const [previousPeriod, funnelCounts, overdueByBroker, staleByBroker] = await Promise.all([
      // Mesmo cálculo, no período imediatamente anterior e de mesma duração.
      loadClients(baseWhere, prevFrom, prevTo, basis === 'event'),
      prisma.client.groupBy({
        by: ['funnelId'],
        where: { brokerId: { in: brokerIds }, createdAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['userId'],
        where: { userId: { in: brokerIds }, isCompleted: false, dateTime: { lt: now } },
        _count: { _all: true },
      }),
      prisma.client.groupBy({
        by: ['brokerId'],
        where: {
          brokerId: { in: brokerIds },
          overallStatus: ClientOverallStatus.ACTIVE,
          updatedAt: { lt: subDays(now, STALE_DAYS) },
        },
        _count: { _all: true },
      }),
    ]);

    const previous = { leads: 0, steps: steps.map(() => 0), won: 0, volume: 0 };
    for (const e of evaluate(previousPeriod.rows, previousPeriod.basis, prevFrom, prevTo)) {
      if (e.entered) previous.leads++;
      e.stepHit.forEach((hit, i) => { if (hit) previous.steps[i]++; });
      if (e.wonHit) {
        previous.won++;
        previous.volume += e.client.saleDetails?.saleValue ?? 0;
      }
    }

    // Agrupamento da evolução: por dia até 31 dias, por mês acima disso.
    const byDay = rangeMs <= 31 * DAY_MS;
    const bucketKey = (d: Date) => spDay(d).slice(0, byDay ? 10 : 7);
    const trend = new Map<string, { label: string; leads: number; won: number }>();
    for (let cursor = new Date(from); cursor <= to; cursor = new Date(cursor.getTime() + DAY_MS)) {
      const key = bucketKey(cursor);
      if (trend.has(key)) continue;
      const [y, m, d] = spDay(cursor).split('-');
      trend.set(key, { label: byDay ? `${d}/${m}` : `${MONTHS[Number(m) - 1]}/${y.slice(2)}`, leads: 0, won: 0 });
    }

    const emptyRow = () => ({ leads: 0, steps: steps.map(() => 0), won: 0, volume: 0 });
    const totals = { ...emptyRow(), lost: 0, active: 0 };
    const perBroker = new Map<string, ReturnType<typeof emptyRow>>();
    const perSource = new Map<string, ReturnType<typeof emptyRow>>();

    for (const e of evaluated) {
      const c = e.client;
      const volume = e.wonHit ? c.saleDetails?.saleValue ?? 0 : 0;
      const source = c.campaignSource?.trim() || 'Sem campanha';
      if (!perBroker.has(c.brokerId)) perBroker.set(c.brokerId, emptyRow());
      if (!perSource.has(source)) perSource.set(source, emptyRow());

      for (const row of [totals, perBroker.get(c.brokerId)!, perSource.get(source)!]) {
        if (e.entered) row.leads++;
        e.stepHit.forEach((hit, i) => { if (hit) row.steps[i]++; });
        if (e.wonHit) row.won++;
        row.volume += volume;
      }

      if (e.entered) {
        if (c.overallStatus === ClientOverallStatus.LOST) totals.lost++;
        if (c.overallStatus === ClientOverallStatus.ACTIVE) totals.active++;
        const bucket = trend.get(bucketKey(c.createdAt));
        if (bucket) bucket.leads++;
      }
      if (e.wonHit) {
        const bucket = trend.get(bucketKey(e.wonDate ?? c.createdAt));
        if (bucket) bucket.won++;
      }
    }

    // Etapa por etapa: onde estão hoje os clientes que entraram no período, no
    // funil filtrado ou, sem filtro, no funil com mais entradas.
    const countByFunnel = new Map(funnelCounts.map(r => [r.funnelId, r._count._all]));
    const stagesFunnelId =
      funnelFilter ?? Array.from(countByFunnel.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? funnels[0]?.id ?? null;
    const stagesFunnel = funnels.find(f => f.id === stagesFunnelId) ?? null;
    const stagesCohort = stagesFunnel
      ? evaluated.filter(e => e.entered && e.client.funnelId === stagesFunnel.id).map(e => e.client)
      : [];
    const stageSteps = stagesFunnel
      ? [
          ...stagesFunnel.stages.map((s, i) => ({
            name: s.name,
            count: i === 0 ? stagesCohort.length : stagesCohort.filter(c => reachedNow(c, s.order)).length,
          })),
          { name: 'Venda', count: stagesCohort.filter(c => c.overallStatus === ClientOverallStatus.WON).length },
        ]
      : [];

    const overdueMap = new Map(overdueByBroker.map(r => [r.userId, r._count._all]));
    const staleMap = new Map(staleByBroker.map(r => [r.brokerId, r._count._all]));
    const byBroker = scope.brokers
      .filter(b => brokerIds.includes(b.id))
      .map(b => ({
        id: b.id,
        name: b.name,
        ...(perBroker.get(b.id) ?? emptyRow()),
        overdueTasks: overdueMap.get(b.id) ?? 0,
        staleClients: staleMap.get(b.id) ?? 0,
      }))
      .sort((a, b) => b.leads - a.leads || a.name.localeCompare(b.name));

    const bySource = Array.from(perSource.entries())
      .map(([name, row]) => ({ name, ...row }))
      .filter(row => row.leads > 0 || row.won > 0 || row.steps.some(n => n > 0))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 10);

    return NextResponse.json({
      view: scope.view,
      basis,
      // Pediu data real mas o histórico não pôde ser lido; diz por quê.
      historyMissing,
      historySince: historySince ? spDay(historySince) : null,
      range: { from: spDay(from), to: spDay(to) },
      defaultPeriod: config.defaultPeriod,
      usesDefaultPeriod,
      brokers: scope.brokers,
      funnels: funnels.map(f => ({ id: f.id, name: f.name, count: countByFunnel.get(f.id) ?? 0 })),
      widgets: config.widgets,
      steps: steps.map((s, i) => ({
        id: s.id,
        label: s.label,
        count: stepMeasurable[i] ? totals.steps[i] : null,
        prevCount: stepMeasurable[i] ? previous.steps[i] : null,
      })),
      kpis: {
        leads: totals.leads,
        prevLeads: previous.leads,
        won: totals.won,
        prevWon: previous.won,
        prevVolume: previous.volume,
        lost: totals.lost,
        active: totals.active,
        volume: totals.volume,
      },
      stagesFunnelName: stagesFunnel?.name ?? null,
      stageSteps,
      trend: Array.from(trend.values()),
      byBroker,
      bySource,
      truncated: rows.length >= CLIENT_LIMIT,
      staleDays: STALE_DAYS,
    });
  } catch (error) {
    console.error('Erro ao buscar análises do dashboard:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
