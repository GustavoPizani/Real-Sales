import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { DateRange } from "react-day-picker";
import { addDays, differenceInCalendarDays, format } from "date-fns";

// O Supabase devolve no máximo 1000 linhas por consulta. A tabela tem uma linha
// por anúncio por dia, então um mês de campanhas passa disso com facilidade:
// sem paginar, os totais do dashboard saíam cortados sem nenhum aviso.
const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;
const METRIC_COLUMNS = "id,date,account_name,campaign_name,ad_name,spend,leads,impressions,clicks,reach,thumbnail_url,channel";

export interface CampaignRow {
  account_name: string;
  campaign_name: string;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpl: number;
  ctr: number;
  cpc: number;
}

export interface CreativeRow {
  account_name: string;
  campaign_name: string;
  ad_name: string;
  thumbnail_url: string | null;
  channel: string | null;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  cpl: number;
  ctr: number;
}

export interface DailyRow {
  date: string;
  account_name: string;
  campaign_name: string;
  spend: number;
  leads: number;
}

const day = (d: Date) => format(d, "yyyy-MM-dd");
const safeNumber = (val: unknown) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

async function fetchAllMetrics(userId: string, from: string, to: string) {
  const rows: any[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("campaign_metrics")
      .select(METRIC_COLUMNS)
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      // Ordem estável: sem ela as páginas podem repetir ou pular linhas.
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

// A chave sempre inclui a conta: duas contas podem ter campanhas com o mesmo
// nome, e antes elas eram somadas como uma só.
function groupCampaigns(rows: any[]): CampaignRow[] {
  const groups: Record<string, any> = {};
  for (const row of rows) {
    const account_name = row.account_name?.trim() || "Conta desconhecida";
    const campaign_name = row.campaign_name || "Campanha sem nome";
    const key = `${account_name}|${campaign_name}`;
    const g = (groups[key] ??= { account_name, campaign_name, spend: 0, leads: 0, impressions: 0, clicks: 0, reach: 0 });
    g.spend += safeNumber(row.spend);
    g.leads += safeNumber(row.leads);
    g.impressions += safeNumber(row.impressions);
    g.clicks += safeNumber(row.clicks);
    g.reach += safeNumber(row.reach);
  }
  return Object.values(groups)
    .map((c: any) => ({
      ...c,
      cpl: c.leads > 0 ? c.spend / c.leads : 0,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

function groupCreatives(rows: any[]): CreativeRow[] {
  const groups: Record<string, any> = {};
  for (const row of rows) {
    const account_name = row.account_name?.trim() || "Conta desconhecida";
    const campaign_name = row.campaign_name || "Campanha sem nome";
    const ad_name = row.ad_name || "Criativo sem nome";
    const key = `${account_name}|${campaign_name}|${ad_name}`;
    const g = (groups[key] ??= { account_name, campaign_name, ad_name, thumbnail_url: null, channel: row.channel ?? null, spend: 0, leads: 0, impressions: 0, clicks: 0 });
    // As linhas vêm em ordem de data: fica a miniatura mais recente que existir.
    if (row.thumbnail_url) g.thumbnail_url = row.thumbnail_url;
    g.spend += safeNumber(row.spend);
    g.leads += safeNumber(row.leads);
    g.impressions += safeNumber(row.impressions);
    g.clicks += safeNumber(row.clicks);
  }
  return Object.values(groups)
    .map((ad: any) => ({
      ...ad,
      cpl: ad.leads > 0 ? ad.spend / ad.leads : 0,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads || b.spend - a.spend);
}

// Por dia, conta e campanha. A página soma por dia depois de aplicar os filtros;
// antes vinha já somado e o gráfico ignorava o filtro de conta.
function groupDaily(rows: any[]): DailyRow[] {
  const groups: Record<string, DailyRow> = {};
  for (const row of rows) {
    const account_name = row.account_name?.trim() || "Conta desconhecida";
    const campaign_name = row.campaign_name || "Campanha sem nome";
    const key = `${row.date}|${account_name}|${campaign_name}`;
    const g = (groups[key] ??= { date: row.date, account_name, campaign_name, spend: 0, leads: 0 });
    g.spend += safeNumber(row.spend);
    g.leads += safeNumber(row.leads);
  }
  return Object.values(groups).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * Dados do dashboard de marketing para o período escolhido, mais as campanhas
 * do período imediatamente anterior (mesma duração) para a comparação.
 *
 * A sincronização com o Meta roda no servidor (/api/marketing/sync): esta tela
 * não lê nem decifra o token.
 */
export const useDashboardData = (dateRange?: DateRange) => {
  const [data, setData] = useState<CampaignRow[]>([]);
  const [previousData, setPreviousData] = useState<CampaignRow[]>([]);
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  const from = dateRange?.from ? day(dateRange.from) : day(addDays(new Date(), -30));
  const to = dateRange?.to ? day(dateRange.to) : dateRange?.from ? day(dateRange.from) : day(new Date());

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Período anterior: mesma duração, terminando na véspera do início.
      const fromDate = new Date(`${from}T00:00:00`);
      const length = differenceInCalendarDays(new Date(`${to}T00:00:00`), fromDate) + 1;
      const previousFrom = day(addDays(fromDate, -length));

      const rows = await fetchAllMetrics(user.id, previousFrom, to);
      const current = rows.filter(row => String(row.date) >= from);
      const previous = rows.filter(row => String(row.date) < from);

      setData(groupCampaigns(current));
      setPreviousData(groupCampaigns(previous));
      setCreatives(groupCreatives(current));
      setDailyMetrics(groupDaily(current));
    } catch (error: any) {
      console.error("Erro ao carregar o dashboard de marketing:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/marketing/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ since: from, until: to }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error || "Falha ao sincronizar com o Meta.");

      if (result.errors?.length > 0) {
        toast({
          variant: "destructive",
          title: result.imported > 0 ? "Sincronizado com falhas" : "Não foi possível sincronizar",
          description: result.errors[0],
        });
      } else {
        toast({ title: "Campanhas sincronizadas", description: `${result.imported} registros atualizados em ${result.accounts} conta(s).` });
      }
      await fetchDashboardData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na sincronização", description: error.message });
    } finally {
      setIsSyncing(false);
    }
  }, [from, to, toast, fetchDashboardData]);

  return { data, previousData, creatives, dailyMetrics, isLoading, isSyncing, hasError, sync, reload: fetchDashboardData };
};
