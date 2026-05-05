// app/(marketing)/marketing/page.tsx
"use client";

import { useState, useMemo } from "react";
import { OverviewView } from "@/components/marketing/OverviewView";
import { CampaignView } from "@/components/marketing/CampaignView";
import { CreativeView } from "@/components/marketing/CreativeView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData } from "@/hooks/marketing/useDashboardData";
import { Button } from "@/components/ui/button";
import { FileText, Filter, RefreshCw } from "lucide-react";
import { PDFReportTemplate } from "@/components/marketing/PDFReportTemplate";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";

export default function MarketingPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { data: campaignData, dailyMetrics: dailyData, creatives, isLoading } = useDashboardData(dateRange, refreshTrigger);

  const handleExportPDF = async () => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    const uniqueCampaignNames = Array.from(new Set(filteredCampaigns.map((d: any) => d.campaign_name))).filter(Boolean);
    const totalPages = 1 + uniqueCampaignNames.length;

    const pdf = new jsPDF("p", "mm", "a4");

    for (let i = 1; i <= totalPages; i++) {
      const element = document.getElementById(`report-page-${i}`);
      if (!element) continue;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 1) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    }

    const conta = selectedAccount === "all" ? "Todas_as_Contas" : selectedAccount.replace(/\s+/g, "_");
    const de = dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : "inicio";
    const ate = dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : "fim";
    pdf.save(`Relatorio_${conta}_${de}_ate_${ate}.pdf`);
  };

  const availableAccounts = useMemo(() => {
    if (!campaignData) return [];
    return Array.from(new Set(campaignData.map((d: any) => d.account_name).filter(Boolean))).sort() as string[];
  }, [campaignData]);

  const subCampaignOptions = useMemo(() => {
    if (selectedAccount === "all") return [];
    const accData = campaignData?.filter((d: any) => d.account_name === selectedAccount) || [];
    return Array.from(new Set(accData.map((d: any) => d.campaign_name).filter(Boolean))) as string[];
  }, [campaignData, selectedAccount]);

  const filteredCampaigns = useMemo(() => {
    let filtered = campaignData || [];
    if (selectedAccount !== "all") filtered = filtered.filter((d: any) => d.account_name === selectedAccount);
    if (selectedAccount !== "all" && selectedCampaign !== "all")
      filtered = filtered.filter((d: any) => d.campaign_name === selectedCampaign);
    return filtered;
  }, [campaignData, selectedAccount, selectedCampaign]);

  const filteredCreatives = useMemo(() => {
    let filtered = creatives || [];
    if (selectedAccount !== "all") filtered = filtered.filter((c: any) => c.account_name === selectedAccount);
    return filtered;
  }, [creatives, selectedAccount]);

  const filteredDailyMetrics = useMemo(() => {
    let source = dailyData || [];
    if (source.length > 0 && source[0].account_name !== undefined) {
      if (selectedAccount !== "all") {
        source = source.filter((m: any) => m.account_name === selectedAccount);
        if (selectedCampaign !== "all") source = source.filter((m: any) => m.campaign_name === selectedCampaign);
      }
      const grouped: Record<string, any> = {};
      source.forEach((item: any) => {
        if (!grouped[item.date]) grouped[item.date] = { date: item.date, spend: 0, leads: 0 };
        grouped[item.date].spend += Number(item.spend || 0);
        grouped[item.date].leads += Number(item.leads || 0);
      });
      return Object.values(grouped)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((d: any) => ({ ...d, cpl: d.leads > 0 ? d.spend / d.leads : 0 }));
    }
    return source;
  }, [dailyData, selectedAccount, selectedCampaign]);

  return (
    <>
      <div className="flex-1 space-y-4 p-8 pt-6 no-print">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between space-y-4 xl:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight text-secondary-custom">
            Marketing Analytics
          </h2>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />

            <Select
              value={selectedAccount}
              onValueChange={(val) => {
                setSelectedAccount(val);
                setSelectedCampaign("all");
              }}
            >
              <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar Conta" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all">Todas as Contas</SelectItem>
                {availableAccounts.map((acc) => (
                  <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setRefreshTrigger(t => t + 1)}
              variant="outline"
              disabled={isLoading}
              className="border-secondary-custom text-secondary-custom hover:bg-secondary-custom hover:text-primary-custom transition-all"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading && refreshTrigger > 0 ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>

            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="border-secondary-custom text-secondary-custom hover:bg-secondary-custom hover:text-primary-custom transition-all"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>

          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-secondary-custom data-[state=active]:text-primary-custom text-muted-foreground">Visão Geral</TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-secondary-custom data-[state=active]:text-primary-custom text-muted-foreground">Campanhas</TabsTrigger>
            <TabsTrigger value="creatives" className="data-[state=active]:bg-secondary-custom data-[state=active]:text-primary-custom text-muted-foreground">Criativos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {selectedAccount !== "all" && subCampaignOptions.length > 1 && (
              <div className="flex items-center gap-2 p-1.5 bg-card border border-border rounded-xl w-full overflow-hidden">
                <span className="text-[9px] font-black text-muted-foreground uppercase px-3 border-r border-border whitespace-nowrap">Projeto</span>
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setSelectedCampaign("all")}
                    className={`text-[11px] h-7 px-3 rounded-lg ${selectedCampaign === "all" ? "bg-secondary-custom text-primary-custom hover:bg-secondary-custom/90" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Todos
                  </Button>
                  {subCampaignOptions.map((name) => (
                    <Button
                      key={name} variant="ghost" size="sm"
                      onClick={() => setSelectedCampaign(name)}
                      className={`text-[11px] h-7 px-3 rounded-lg ${selectedCampaign === name ? "bg-secondary-custom text-primary-custom hover:bg-secondary-custom/90" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <OverviewView data={filteredCampaigns} dailyData={filteredDailyMetrics} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <CampaignView data={filteredCampaigns} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="creatives" className="space-y-4">
            <CreativeView data={filteredCreatives} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {!isLoading && filteredCampaigns.length > 0 && (
        <PDFReportTemplate
          data={filteredCampaigns}
          dateRange={{ from: dateRange?.from || addDays(new Date(), -30), to: dateRange?.to || new Date() }}
        />
      )}
    </>
  );
}
