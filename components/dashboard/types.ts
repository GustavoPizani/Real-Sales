import type { DashboardView } from "@/lib/dashboard-scope";
import type { DashboardConfig, DashboardWidgetId, FunnelInfo, PeriodPreset } from "@/lib/dashboard-config";

export type { DashboardView };

export interface BrokerOption {
  id: string;
  name: string;
}

export interface DashboardTask {
  id: string;
  title: string;
  dateTime: string;
  type: string;
  priority: string;
  clientId: string;
  client: { id: string; fullName: string } | null;
  user: BrokerOption;
}

export interface StaleClient {
  id: string;
  fullName: string;
  updatedAt: string;
  broker: BrokerOption;
  funnelStage: { name: string };
}

export interface DashboardData {
  view: DashboardView;
  brokers: BrokerOption[];
  tasks: DashboardTask[];
  staleClients: StaleClient[];
  totals: { openTasks: number; overdueTasks: number; staleClients: number; activeClients: number };
  staleDays: number;
}

export interface DashboardConfigResponse {
  config: DashboardConfig;
  isDefault: boolean;
  funnels: FunnelInfo[];
}

export interface FunnelStepDatum {
  name: string;
  count: number;
}

export interface TrendDatum {
  label: string;
  leads: number;
  won: number;
}

interface AnalyticsRow {
  leads: number;
  steps: number[];
  won: number;
  volume: number;
}

export interface AnalyticsData {
  view: DashboardView;
  /** event = contado pela data em que aconteceu; cohort = pela data de entrada do cliente. */
  basis: "event" | "cohort";
  /** Por que a data real não está disponível: tabela ausente, servidor desatualizado ou outro erro. */
  historyMissing: "table" | "client" | "other" | null;
  historySince: string | null;
  range: { from: string; to: string };
  defaultPeriod: PeriodPreset;
  usesDefaultPeriod: boolean;
  brokers: BrokerOption[];
  funnels: { id: string; name: string; count: number }[];
  widgets: Record<DashboardWidgetId, boolean>;
  steps: { id: string; label: string; count: number | null; prevCount: number | null }[];
  kpis: { leads: number; prevLeads: number; won: number; prevWon: number; lost: number; active: number; volume: number; prevVolume: number };
  stagesFunnelName: string | null;
  stageSteps: FunnelStepDatum[];
  trend: TrendDatum[];
  byBroker: (AnalyticsRow & { id: string; name: string; overdueTasks: number; staleClients: number })[];
  bySource: (AnalyticsRow & { name: string })[];
  truncated: boolean;
  staleDays: number;
}

export const formatPercent = (value: number) =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const percentOf = (part: number, total: number) => (total > 0 ? formatPercent((part / total) * 100) : "—");

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
