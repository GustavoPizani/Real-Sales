// lib/dashboard-config.ts
// Configuração do dashboard definida pelo MARKETING_ADMIN. Sem dependência de
// servidor: este arquivo é importado tanto pelas rotas quanto pelas telas.

export const DASHBOARD_WIDGETS = [
  { id: 'kpis', label: 'Indicadores', description: 'Entradas, cada etapa de conversão, vendas e volume vendido.' },
  { id: 'conversion', label: 'Funil de conversão', description: 'Quantos clientes que entraram chegaram a cada etapa de conversão.' },
  { id: 'status', label: 'Situação dos clientes', description: 'Dos que entraram no período: ganhos, em andamento e perdidos.' },
  { id: 'stages', label: 'Pipeline etapa por etapa', description: 'Onde estão hoje os clientes que entraram no período, coluna por coluna.' },
  { id: 'trend', label: 'Evolução no período', description: 'Entradas e vendas por dia ou por mês.' },
  { id: 'brokers', label: 'Desempenho por corretor', description: 'Conversão, volume, tarefas atrasadas e clientes parados de cada corretor.' },
  { id: 'sources', label: 'Campanhas', description: 'Entradas e conversão por campanha de origem.' },
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]['id'];

export const PERIOD_PRESETS = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'month', label: 'Este mês' },
  { id: 'last-month', label: 'Mês passado' },
  { id: 'year', label: 'Este ano' },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]['id'];

export const MAX_CONVERSION_STEPS = 6;
const MAX_LABEL_LENGTH = 40;

export interface FunnelInfo {
  id: string;
  name: string;
  stages: { id: string; name: string; order: number }[];
}

/**
 * Etapa de conversão. Em cada funil aponta para uma coluna do pipeline: o
 * cliente conta como tendo chegado à etapa quando está nessa coluna ou em
 * qualquer coluna depois dela (ou foi ganho).
 */
export interface ConversionStep {
  id: string;
  label: string;
  stageByFunnel: Record<string, string>;
}

export interface DashboardConfig {
  steps: ConversionStep[];
  widgets: Record<DashboardWidgetId, boolean>;
  defaultPeriod: PeriodPreset;
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const allWidgetsOn = () =>
  Object.fromEntries(DASHBOARD_WIDGETS.map(w => [w.id, true])) as Record<DashboardWidgetId, boolean>;

/**
 * Ponto de partida enquanto o admin não salvou nada: "Agendaram" e
 * "Visitaram", ligados às colunas cujo nome contém "agend" / "visit".
 */
export function defaultDashboardConfig(funnels: FunnelInfo[]): DashboardConfig {
  const scheduled: ConversionStep = { id: 'scheduled', label: 'Agendaram', stageByFunnel: {} };
  const visited: ConversionStep = { id: 'visited', label: 'Visitaram', stageByFunnel: {} };

  for (const funnel of funnels) {
    const stages = [...funnel.stages].sort((a, b) => a.order - b.order);
    const scheduleStage = stages.find(s => normalize(s.name).includes('agend'));
    const visitStage = stages.find(s => normalize(s.name).includes('visit') && !normalize(s.name).includes('agend'));
    if (scheduleStage) scheduled.stageByFunnel[funnel.id] = scheduleStage.id;
    if (visitStage) visited.stageByFunnel[funnel.id] = visitStage.id;
  }

  return { steps: [scheduled, visited], widgets: allWidgetsOn(), defaultPeriod: '90d' };
}

/** Valida o que veio do banco ou da tela, descartando funis e colunas que não existem mais. */
export function sanitizeDashboardConfig(input: unknown, funnels: FunnelInfo[]): DashboardConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const stagesByFunnel = new Map(funnels.map(f => [f.id, new Set(f.stages.map(s => s.id))]));

  const steps: ConversionStep[] = [];
  const usedIds = new Set<string>();
  for (const item of Array.isArray(raw.steps) ? raw.steps : []) {
    if (steps.length >= MAX_CONVERSION_STEPS || !item || typeof item !== 'object') continue;
    const step = item as Record<string, unknown>;
    const label = typeof step.label === 'string' ? step.label.trim().slice(0, MAX_LABEL_LENGTH) : '';
    const id = typeof step.id === 'string' ? step.id.trim().slice(0, 64) : '';
    if (!label || !id || usedIds.has(id)) continue;

    const stageByFunnel: Record<string, string> = {};
    const mapping = step.stageByFunnel && typeof step.stageByFunnel === 'object' ? step.stageByFunnel : {};
    for (const [funnelId, stageId] of Object.entries(mapping as Record<string, unknown>)) {
      if (typeof stageId === 'string' && stagesByFunnel.get(funnelId)?.has(stageId)) stageByFunnel[funnelId] = stageId;
    }

    usedIds.add(id);
    steps.push({ id, label, stageByFunnel });
  }

  const widgets = allWidgetsOn();
  const rawWidgets = raw.widgets && typeof raw.widgets === 'object' ? (raw.widgets as Record<string, unknown>) : {};
  for (const w of DASHBOARD_WIDGETS) {
    if (typeof rawWidgets[w.id] === 'boolean') widgets[w.id] = rawWidgets[w.id] as boolean;
  }

  const defaultPeriod = PERIOD_PRESETS.some(p => p.id === raw.defaultPeriod) ? (raw.defaultPeriod as PeriodPreset) : '90d';

  return { steps, widgets, defaultPeriod };
}
