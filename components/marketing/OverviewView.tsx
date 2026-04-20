"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { TemporalChart } from "@/components/marketing/TemporalChart";
import { PeriodChart } from "@/components/marketing/PeriodChart";
import { CampaignRanking } from "@/components/marketing/CampaignRanking";
import { LeadCostInsights } from "@/components/marketing/LeadCostInsights";
import { 
  DollarSign, MousePointer, Hash, Percent, Users, Target, Eye, 
  MousePointerClick, Globe, Activity, Bot, TrendingUp, AlertTriangle, CheckCircle, TrendingDown, Loader2, RefreshCcw, Bug
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import CryptoJS from "crypto-js";

const KPICard = ({ title, value, icon: Icon, format, isLoading, invertTrendColor }: any) => {
  const formattedValue = () => {
    if (format === 'currency') return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    if (format === 'percentage') return `${(value || 0).toFixed(2)}%`;
    if (format === 'decimal') return (value || 0).toFixed(2);
    return new Intl.NumberFormat("pt-BR").format(value || 0);
  };
  
  if (isLoading) return <div className="bg-[#1e293b]/40 border border-slate-700/50 p-4 rounded-xl h-24 animate-pulse" />;

  return (
    <div className="bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl hover:border-[#f90f54]/30 transition-all flex flex-col justify-between h-full group">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate mr-1">{title}</span>
        <Icon className="w-4 h-4 text-[#f90f54] opacity-70 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-xl font-bold text-white tracking-tight truncate">{formattedValue()}</p>
    </div>
  );
};

export const OverviewView = ({ data, dailyData, isLoading, subCampaignFilter }: any) => {
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastDataRef = useRef<string>("");

  // RESTAURADO: Cálculos completos incluindo Reach e Impressions para Alcance/Frequência
  const totals = useMemo(() => (data || []).reduce((acc: any, curr: any) => ({
    spend: acc.spend + (Number(curr.spend) || 0),
    impressions: acc.impressions + (Number(curr.impressions) || 0),
    clicks: acc.clicks + (Number(curr.clicks) || 0),
    leads: acc.leads + (Number(curr.leads) || 0),
    reach: acc.reach + (Number(curr.reach) || 0),
  }), { spend: 0, impressions: 0, clicks: 0, leads: 0, reach: 0 }), [data]);

  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;

  useEffect(() => {
    const loadInsights = async () => {
      const currentSignature = JSON.stringify(data?.map((d: any) => d.campaign_name + d.spend));
      
      if (!data || data.length === 0 || isLoading) return;
      if (currentSignature === lastDataRef.current && retryCount === 0 && aiInsights.length > 0) return;
      
      lastDataRef.current = currentSignature;
      setIsAiLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: settings } = await supabase.from("api_settings").select("encrypted_value").eq("user_id", user?.id).eq("setting_key", "GEMINI_API_KEY").maybeSingle();

        if (!settings) throw new Error();

        const apiKey = CryptoJS.AES.decrypt(settings.encrypted_value, "ads-intel-hub-2024").toString(CryptoJS.enc.Utf8);
        const { data: responseData } = await supabase.functions.invoke('ai-chat', { body: { apiKey, data } });

        let insights = responseData;
        if (typeof responseData === 'string') {
          try { insights = JSON.parse(responseData); } catch { insights = []; }
        }
        if (insights && !Array.isArray(insights) && insights.insights) insights = insights.insights;
        
        setAiInsights(Array.isArray(insights) ? insights : []);
      } catch (error) {
        console.error("Erro Analista Sênior:", error);
        setAiInsights([{ type: 'danger', text: 'Erro ao processar IA.' }]);
      } finally {
        setIsAiLoading(false);
      }
    };
    loadInsights();
  }, [data, isLoading, retryCount]);

  const cards = [
    { title: "Investimento", value: totals.spend, icon: DollarSign, format: 'currency' },
    { title: "Leads", value: totals.leads, icon: Target, format: 'number' },
    { title: "CPL", value: cpl, icon: Users, format: 'currency' },
    { title: "CTR", value: ctr, icon: Percent, format: 'percentage' },
    { title: "CPC", value: cpc, icon: MousePointer, format: 'currency' },
    { title: "Impressões", value: totals.impressions, icon: Eye, format: 'number' },
    { title: "Cliques", value: totals.clicks, icon: MousePointerClick, format: 'number' },
    { title: "CPM", value: cpm, icon: Hash, format: 'currency' },
    { title: "Alcance", value: totals.reach, icon: Globe, format: 'number' },
    { title: "Frequência", value: frequency, icon: Activity, format: 'decimal' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {subCampaignFilter}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full pb-6">
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((card, index) => (
              <KPICard key={index} {...card} isLoading={isLoading} />
            ))}
          </div>

          <div className="flex-1 min-h-[400px] bg-[#1e293b]/20 rounded-2xl border border-slate-800/50 p-4 shadow-sm">
            <TemporalChart data={dailyData || []} isLoading={isLoading} />
          </div>
        </div>

        <div className="xl:col-span-1 h-full min-h-[500px]">
          <Card className="bg-[#1e293b]/40 border-slate-700/50 backdrop-blur-md h-full flex flex-col shadow-xl border-l-4 border-l-[#f90f54]">
            <CardHeader className="border-b border-slate-700/50 pb-4 flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Bot className="w-6 h-6 text-[#f90f54]" /> Analista Sênior
              </CardTitle>
              {!isAiLoading && (
                <Button variant="ghost" size="icon" onClick={() => setRetryCount(c => c + 1)} title="Refazer Análise">
                  <RefreshCcw className="w-4 h-4 text-slate-400 hover:text-white" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6 flex-1 overflow-y-auto p-4 space-y-4">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="w-10 h-10 text-[#f90f54] animate-spin" />
                  <p className="text-sm text-slate-300 animate-pulse">Analisando...</p>
                </div>
              ) : aiInsights.length > 0 ? (
                aiInsights.map((insight, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                       {insight.type === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                       <span className="text-[10px] font-bold text-[#f90f54] uppercase">{insight.type}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{insight.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-20">
                  <Bug className="w-10 h-10 mx-auto opacity-20 mb-2" />
                  <p className="text-sm">Sem análise disponível.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};