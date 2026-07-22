"use client";

import React from "react";
import { DollarSign, MousePointer, Hash, Percent, Users, Target, Eye, MousePointerClick, Globe, Activity, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const GOLD = "#aa8d44";

interface PDFReportTemplateProps {
  data: any[];
  dateRange: { from: Date; to: Date } | undefined;
}

const fmt = {
  currency: (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0),
  number: (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0),
  percent: (v: number) => `${(v || 0).toFixed(2)}%`,
  decimal: (v: number) => (v || 0).toFixed(2),
};

const KpiCard = ({ title, value, icon: Icon, type }: any) => (
  <div style={{ border: `1px solid #e2e8f0`, borderTop: `3px solid ${GOLD}` }} className="bg-white p-3 rounded-lg flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      <Icon className="w-3 h-3" style={{ color: GOLD }} />
    </div>
    <p className="text-lg font-bold text-slate-900">{value}</p>
  </div>
);

const FunnelBar = ({ label, value, max, color }: any) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-600">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${max}%`, backgroundColor: color }} />
    </div>
  </div>
);

const ReportPage = ({ title, subTitle, metrics, dateRange, isLast }: any) => {
  const cplHealth = metrics.cpl > 0 ? Math.min((metrics.cpl / 80) * 100, 100) : 0;

  return (
    <div
      className="report-page bg-white text-slate-900"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "14mm 16mm",
        display: "flex",
        flexDirection: "column",
        pageBreakAfter: isLast ? "auto" : "always",
        breakAfter: isLast ? "auto" : "page",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: `4px solid ${GOLD}`, paddingBottom: "14px", marginBottom: "20px" }}
        className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatório de Performance</h1>
          <h2 className="text-base font-semibold mt-0.5" style={{ color: GOLD }}>{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subTitle}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-600 flex items-center justify-end gap-1">
            <Calendar className="w-3 h-3" />
            {dateRange?.from ? format(dateRange.from, "dd MMM yyyy", { locale: ptBR }) : ""} –{" "}
            {dateRange?.to ? format(dateRange.to, "dd MMM yyyy", { locale: ptBR }) : ""}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard title="Investimento" value={fmt.currency(metrics.spend)} icon={DollarSign} />
        <KpiCard title="CPL" value={fmt.currency(metrics.cpl)} icon={Users} />
        <KpiCard title="Leads" value={fmt.number(metrics.leads)} icon={Target} />
        <KpiCard title="CTR" value={fmt.percent(metrics.ctr)} icon={Percent} />
        <KpiCard title="Impressões" value={fmt.number(metrics.impressions)} icon={Eye} />
        <KpiCard title="Cliques" value={fmt.number(metrics.clicks)} icon={MousePointerClick} />
        <KpiCard title="CPC" value={fmt.currency(metrics.cpc)} icon={MousePointer} />
        <KpiCard title="Alcance" value={fmt.number(metrics.reach)} icon={Globe} />
      </div>

      {/* Funil */}
      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-800">
          <Activity className="w-4 h-4" style={{ color: GOLD }} /> Eficiência do Funil
        </h3>
        <div className="space-y-5">
          <FunnelBar label="Investimento" value={fmt.currency(metrics.spend)} max={100} color={GOLD} />
          <FunnelBar
            label={`Saúde do CPL (meta: R$ 40,00)`}
            value={`R$ ${metrics.cpl.toFixed(2)}`}
            max={cplHealth}
            color={metrics.cpl <= 40 ? "#22c55e" : "#ef4444"}
          />
          <FunnelBar
            label="Taxa de Cliques (CTR)"
            value={fmt.percent(metrics.ctr)}
            max={Math.min(metrics.ctr * 10, 100)}
            color={GOLD}
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="border-t border-slate-100 pt-3 text-center mt-auto">
        <p className="text-[9px] text-slate-400">Relatório Confidencial</p>
      </div>
    </div>
  );
};

export const PDFReportTemplate = ({ data, dateRange }: PDFReportTemplateProps) => {
  const calculateMetrics = (dataset: any[]) =>
    dataset.reduce(
      (acc, curr) => {
        const s = { ...acc, spend: acc.spend + (curr.spend || 0), impressions: acc.impressions + (curr.impressions || 0), clicks: acc.clicks + (curr.clicks || 0), leads: acc.leads + (curr.leads || 0), reach: acc.reach + (curr.reach || 0) };
        return { ...s, cpc: s.clicks > 0 ? s.spend / s.clicks : 0, cpm: s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0, ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0, cpl: s.leads > 0 ? s.spend / s.leads : 0, frequency: s.reach > 0 ? s.impressions / s.reach : 0 };
      },
      { spend: 0, impressions: 0, clicks: 0, leads: 0, reach: 0, cpc: 0, cpm: 0, ctr: 0, cpl: 0, frequency: 0 }
    );

  const overviewMetrics = calculateMetrics(data);
  const uniqueCampaigns = Array.from(new Set(data.map(d => d.campaign_name))).filter(Boolean).map(name => ({
    name,
    metrics: calculateMetrics(data.filter(d => d.campaign_name === name)),
  }));

  const pages = [
    { title: "Visão Geral", subTitle: "Consolidado de todas as campanhas.", metrics: overviewMetrics },
    ...uniqueCampaigns.map(c => ({ title: `Campanha: ${c.name}`, subTitle: "Performance detalhada.", metrics: c.metrics })),
  ];

  return (
    <div id="pdf-report-container" className="fixed top-0 left-0 -z-50">
      {pages.map((page, i) => (
        <div key={i} id={`report-page-${i + 1}`}>
          <ReportPage {...page} dateRange={dateRange} isLast={i === pages.length - 1} />
        </div>
      ))}
    </div>
  );
};
