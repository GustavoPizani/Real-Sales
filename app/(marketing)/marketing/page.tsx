// app/(marketing)/marketing/page.tsx
"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { AlertCircle, FileText, RefreshCw, X } from "lucide-react";
import { OverviewView } from "@/components/marketing/OverviewView";
import { CampaignView } from "@/components/marketing/CampaignView";
import { CreativeView } from "@/components/marketing/CreativeView";
import { PDFReportTemplate } from "@/components/marketing/PDFReportTemplate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardData } from "@/hooks/marketing/useDashboardData";
import { DASH_PANEL, DASH_SURFACE } from "@/components/dashboard/ui";

const ALL = "all";
// Abas e filtros em pílula, como no dashboard do CRM.
const TABS_LIST = `h-auto max-w-full justify-start overflow-x-auto rounded-full p-1 ${DASH_SURFACE}`;
const TABS_TRIGGER = "rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none";
export default function MarketingPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [selectedAccount, setSelectedAccount] = useState<string>(ALL);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(ALL);
  const [isExporting, setIsExporting] = useState(false);

  const { data: campaignData, previousData, dailyMetrics, creatives, isLoading, isSyncing, hasError, sync, reload } = useDashboardData(dateRange);

  const availableAccounts = useMemo(
    () => Array.from(new Set(campaignData.map(d => d.account_name))).sort(),
    [campaignData],
  );

  // A campanha é identificada por conta + nome: duas contas podem ter campanhas com o mesmo nome.
  const campaignKey = (row: { account_name: string; campaign_name: string }) => `${row.account_name}|${row.campaign_name}`;

  // Campanhas disponíveis no filtro: as da conta escolhida, ou todas.
  const campaignOptions = useMemo(
    () =>
      campaignData
        .filter(d => selectedAccount === ALL || d.account_name === selectedAccount)
        .map(d => ({ key: campaignKey(d), name: d.campaign_name, account: d.account_name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [campaignData, selectedAccount],
  );

  // Conta e campanha valem para tudo na tela: indicadores, gráficos, tabela e criativos.
  const matches = (row: { account_name: string; campaign_name: string }) =>
    (selectedAccount === ALL || row.account_name === selectedAccount) &&
    (selectedCampaign === ALL || campaignKey(row) === selectedCampaign);

  const filteredCampaigns = useMemo(() => campaignData.filter(matches), [campaignData, selectedAccount, selectedCampaign]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredPrevious = useMemo(() => previousData.filter(matches), [previousData, selectedAccount, selectedCampaign]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredCreatives = useMemo(() => creatives.filter(matches), [creatives, selectedAccount, selectedCampaign]); // eslint-disable-line react-hooks/exhaustive-deps

  const dailyTotals = useMemo(() => {
    const byDay: Record<string, { date: string; spend: number; leads: number }> = {};
    for (const row of dailyMetrics.filter(matches)) {
      const day = (byDay[row.date] ??= { date: row.date, spend: 0, leads: 0 });
      day.spend += row.spend;
      day.leads += row.leads;
    }
    return Object.values(byDay).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [dailyMetrics, selectedAccount, selectedCampaign]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);

      const uniqueCampaignNames = Array.from(new Set(filteredCampaigns.map(d => d.campaign_name))).filter(Boolean);
      const totalPages = 1 + uniqueCampaignNames.length;
      const pdf = new jsPDF("p", "mm", "a4");

      for (let i = 1; i <= totalPages; i++) {
        const element = document.getElementById(`report-page-${i}`);
        if (!element) continue;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (i > 1) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgWidth, imgHeight);
      }

      const conta = selectedAccount === ALL ? "Todas_as_Contas" : selectedAccount.replace(/\s+/g, "_");
      const de = dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : "inicio";
      const ate = dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : "fim";
      pdf.save(`Relatorio_${conta}_${de}_ate_${ate}.pdf`);
    } catch {
      toast({ variant: "destructive", title: "Não foi possível gerar o PDF", description: "Tente novamente." });
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = filteredCampaigns.length > 0;

  return (
    <>
      <div className="no-print p-3 md:p-4">
        <div className={`space-y-5 sm:space-y-6 ${DASH_PANEL}`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Marketing</h1>
              <p className="text-sm text-muted-foreground">Investimento, leads e custo das campanhas do Meta Ads.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="h-11 rounded-full px-5" onClick={sync} disabled={isSyncing || isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
              <Button variant="outline" className="h-11 rounded-full px-5" onClick={handleExportPDF} disabled={!hasData || isExporting || isLoading}>
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                {isExporting ? "Gerando..." : "Exportar PDF"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-1 sm:w-auto">
              <span className="text-xs font-medium text-muted-foreground">Período</span>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            <div className="w-full space-y-1 sm:w-56">
              <label htmlFor="marketing-account" className="text-xs font-medium text-muted-foreground">Conta de anúncio</label>
              <Select value={selectedAccount} onValueChange={value => { setSelectedAccount(value); setSelectedCampaign(ALL); }}>
                <SelectTrigger id="marketing-account" className={`rounded-full ${DASH_SURFACE}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as contas</SelectItem>
                  {availableAccounts.map(account => <SelectItem key={account} value={account}>{account}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1 sm:w-72">
              <label htmlFor="marketing-campaign" className="text-xs font-medium text-muted-foreground">Campanha</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign} disabled={campaignOptions.length === 0}>
                <SelectTrigger id="marketing-campaign" className={`rounded-full ${DASH_SURFACE}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as campanhas</SelectItem>
                  {campaignOptions.map(option => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.name}
                      {/* Com todas as contas juntas, a conta aparece ao lado para diferenciar nomes iguais. */}
                      {selectedAccount === ALL && availableAccounts.length > 1 ? ` · ${option.account}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(selectedAccount !== ALL || selectedCampaign !== ALL) && (
              <Button variant="ghost" className="rounded-full" onClick={() => { setSelectedAccount(ALL); setSelectedCampaign(ALL); }}>
                <X className="mr-1.5 h-4 w-4" aria-hidden="true" />Limpar filtros
              </Button>
            )}
          </div>

          {hasError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Não foi possível carregar os dados das campanhas.</p>
              <Button variant="outline" className="rounded-full" onClick={reload}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Tentar de novo
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-5">
              <TabsList className={TABS_LIST}>
                <TabsTrigger className={TABS_TRIGGER} value="overview">Visão geral</TabsTrigger>
                <TabsTrigger className={TABS_TRIGGER} value="campaigns">Campanhas</TabsTrigger>
                <TabsTrigger className={TABS_TRIGGER} value="creatives">Criativos</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewView data={filteredCampaigns} previousData={filteredPrevious} dailyData={dailyTotals} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="campaigns">
                <CampaignView data={filteredCampaigns} isLoading={isLoading} showAccount={selectedAccount === ALL && availableAccounts.length > 1} />
              </TabsContent>
              <TabsContent value="creatives">
                <CreativeView data={filteredCreatives} isLoading={isLoading} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {!isLoading && hasData && (
        <PDFReportTemplate
          data={filteredCampaigns}
          dateRange={{ from: dateRange?.from || addDays(new Date(), -30), to: dateRange?.to || new Date() }}
        />
      )}
    </>
  );
}
