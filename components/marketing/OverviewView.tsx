"use client";

import { TemporalChart } from "@/components/marketing/TemporalChart";
import { DollarSign, MousePointer, Hash, Percent, Users, Target, Eye, MousePointerClick, Globe, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const OverviewView = ({ data = [], dailyData = [], isLoading = false }: any) => {
  // Componente interno dos Cards (KPIs)
  const KPICard = ({ title, value, icon: Icon, format, isLoading }: any) => {
    const formattedValue = () => {
      if (value === undefined || value === null) return "0";
      if (format === "currency") {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
      }
      if (format === "percentage") return `${value.toFixed(2)}%`;
      if (format === "decimal") return value.toFixed(2);
      return new Intl.NumberFormat("pt-BR").format(value);
    };

    return (
      <Card className="bg-[#1A1A1A] border-[#333] hover:border-[#aa8d44]/50 transition-colors shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-gray-400 uppercase tracking-wider truncate" title={title}>{title}</CardTitle>
          <Icon className="h-5 w-5 text-[#aa8d44]" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-[#333]" />
          ) : (
            <div className="text-2xl font-bold text-white truncate">{formattedValue()}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Cálculos básicos consolidados
  const totals = data.reduce(
    (acc: any, curr: any) => ({
      spend: acc.spend + (Number(curr.spend) || 0),
      leads: acc.leads + (Number(curr.leads) || 0),
      clicks: acc.clicks + (Number(curr.clicks) || 0),
      impressions: acc.impressions + (Number(curr.impressions) || 0),
      reach: acc.reach + (Number(curr.reach) || 0),
    }),
    { spend: 0, leads: 0, clicks: 0, impressions: 0, reach: 0 }
  );

  const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;

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
    <div className="space-y-6">
      {/* Cards Superiores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card, index) => (
          <KPICard key={index} {...card} isLoading={isLoading} />
        ))}
      </div>

      {/* Gráficos e Tabelas - Ajustados para forçar o fundo escuro e sumir com a faixa branca */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-2 bg-[#1A1A1A] border-[#333] shadow-xl">
          <CardHeader>
            <CardTitle className="text-[#D4AF37]">Evolução Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <TemporalChart data={dailyData} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};