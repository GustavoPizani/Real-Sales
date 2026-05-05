import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = "ads-intel-hub-2024";

export const useDashboardData = (dateRange?: DateRange, refreshTrigger?: number) => {
  const [data, setData] = useState<any[]>([]); 
  const [creatives, setCreatives] = useState<any[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
  const [rawMetrics, setRawMetrics] = useState<any[]>([]);
  
  // Armazena nomes de CONTAS para o filtro principal
  const [allProjects, setAllProjects] = useState<string[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [kpis, setKpis] = useState({
    investido: 0, impressions: 0, clicks: 0, leads: 0, reach: 0, cpl: 0, ctr: 0, cpc: 0, crm_leads: 0, sales: 0, revenue: 0,
  });

  const safeNumber = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const decrypt = (ciphertext: string) => {
    try { return CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) }
    catch { return '' }
  }

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Sincroniza com a Meta API quando acionado manualmente
      if (refreshTrigger > 0) {
        console.log("🔄 Sincronizando com a API da Meta...");

        const { data: settingsData } = await supabase
          .from('api_settings')
          .select('setting_key, encrypted_value')
          .eq('user_id', user.id)

        const keys: Record<string, string> = {}
        settingsData?.forEach(s => {
          const val = decrypt(s.encrypted_value)
          if (val) keys[s.setting_key] = val
        })

        const accessToken = keys['META_ACCESS_TOKEN']
        const adAccountIds = keys['META_AD_ACCOUNT_IDS']?.split(',').filter(Boolean) ?? []
        const since = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        const until = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

        if (accessToken && adAccountIds.length > 0) {
          await supabase.functions.invoke('meta-insights', {
            body: { adAccountIds, accessToken, since, until }
          })
          console.log("✅ Sincronização Meta finalizada.")
        } else {
          console.warn("[SYNC] META_ACCESS_TOKEN ou META_AD_ACCOUNT_IDS não configurados.")
          toast({ variant: "destructive", title: "Chaves Meta não configuradas", description: "Configure META_ACCESS_TOKEN e as Contas de Anúncio em Configurações." })
        }
      }

      // Busca os dados do banco após sincronizar
      const { data: metricsData, error: metricsError } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('user_id', user.id);

      // 2. BUSCA NOMES DAS CONTAS (Agora o banco já terá a EVO e VILA SAÚDE)
      // Adicionamos .trim() e limpeza de vazios para evitar "Unknown Account" ou nomes duplicados
      const { data: allAccountsData } = await supabase
        .from("campaign_metrics")
        .select("account_name")
        .eq("user_id", user.id);

      if (allAccountsData) {
        const uniqueAccounts = Array.from(new Set(
            allAccountsData
                .map(c => c.account_name ? c.account_name.trim() : null)
                .filter(Boolean)
        )).sort() as string[];
        setAllProjects(uniqueAccounts);
      }

      // 3. BUSCA MÉTRICAS (Filtered by Date)
      let query = supabase.from("campaign_metrics").select("*").eq("user_id", user.id);
      if (dateRange?.from) query = query.gte("date", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange?.to) query = query.lte("date", format(dateRange.to, "yyyy-MM-dd"));

      const { data: metrics, error: dbError } = await query;
      if (dbError) throw dbError;

      setRawMetrics(metrics || []);

      // CRM leads — contagem via API do sistema
      const crmRes = await fetch(`/api/dashboard/stats`).catch(() => null)
      const crmStats = crmRes?.ok ? await crmRes.json().catch(() => null) : null
      const crmLeadsCount = crmStats?.totalClients ?? 0

      // 5. PROCESSAMENTO: Agrupar por Campanha, incluindo account_name
      const campaignGroups: Record<string, any> = {};
      const creativeGroups: Record<string, any> = {};
      const dailyGroups: Record<string, any> = {};
      let totalSpend = 0, totalLeads = 0, totalImpressions = 0, totalClicks = 0, totalReach = 0;

      (metrics || []).forEach((row) => {
        const accName = row.account_name?.trim() || "Conta Desconhecida";
        const campName = row.campaign_name || "Campanha sem nome";
        const adName = row.ad_name || "Criativo sem nome";
        
        const spend = safeNumber(row.spend);
        const leads = safeNumber(row.leads);
        const impressions = safeNumber(row.impressions);
        const clicks = safeNumber(row.clicks);
        const reach = safeNumber(row.reach);

        totalSpend += spend; totalLeads += leads; totalImpressions += impressions; totalClicks += clicks; totalReach += reach;

        // A. Campanhas
        if (!campaignGroups[campName]) {
          campaignGroups[campName] = { 
              account_name: accName,
              campaign_name: campName, 
              spend: 0, leads: 0, impressions: 0, clicks: 0, reach: 0 
          };
        }
        campaignGroups[campName].spend += spend; 
        campaignGroups[campName].leads += leads; 
        campaignGroups[campName].impressions += impressions; 
        campaignGroups[campName].clicks += clicks; 
        campaignGroups[campName].reach += reach;

        // B. Criativos
        const creativeKey = `${adName}_${campName}`; 
        if (!creativeGroups[creativeKey]) {
          creativeGroups[creativeKey] = { 
              account_name: accName,
              ad_name: adName, 
              campaign_name: campName, 
              thumbnail_url: row.thumbnail_url, channel: row.channel, spend: 0, leads: 0, impressions: 0, clicks: 0 
          };
        }
        creativeGroups[creativeKey].spend += spend; 
        creativeGroups[creativeKey].leads += leads; 
        creativeGroups[creativeKey].impressions += impressions; 
        creativeGroups[creativeKey].clicks += clicks;

        // C. Diário
        if (!dailyGroups[row.date]) dailyGroups[row.date] = { date: row.date, spend: 0, leads: 0 };
        dailyGroups[row.date].spend += spend; 
        dailyGroups[row.date].leads += leads;
      });

      const formattedCampaigns = Object.values(campaignGroups).map((camp: any) => ({ ...camp, cpl: camp.leads > 0 ? camp.spend / camp.leads : 0, ctr: camp.impressions > 0 ? (camp.clicks / camp.impressions) * 100 : 0, cpc: camp.clicks > 0 ? camp.spend / camp.clicks : 0 }));
      const formattedCreatives = Object.values(creativeGroups).map((ad: any) => ({ ...ad, cpl: ad.leads > 0 ? ad.spend / ad.leads : 0, ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0 }));
      const formattedDaily = Object.values(dailyGroups).map((day: any) => ({ ...day, cpl: day.leads > 0 ? day.spend / day.leads : 0 })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData(formattedCampaigns);
      setCreatives(formattedCreatives);
      setDailyMetrics(formattedDaily);
      
      setKpis({ 
          investido: totalSpend, 
          leads: totalLeads, 
          impressions: totalImpressions, 
          clicks: totalClicks, 
          reach: totalReach,
          cpl: totalLeads > 0 ? totalSpend / totalLeads : 0, 
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0, 
          cpc: totalClicks > 0 ? totalSpend / totalClicks : 0, 
          crm_leads: crmLeadsCount,
          sales: 0, 
          revenue: 0 
      });

    } catch (error: any) {
      console.error("Erro Dashboard Hook:", error);
      toast({ variant: "destructive", title: "Erro ao carregar dados", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, toast, refreshTrigger]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData, refreshTrigger]);

  return { data, creatives, dailyMetrics, rawMetrics, allProjects, isLoading, kpis, fetchDashboardData };
};