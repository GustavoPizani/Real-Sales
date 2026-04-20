// app/(app)/marketing/page.tsx
"use client";

import { OverviewView } from "@/components/marketing/OverviewView";
import { CampaignView } from "@/components/marketing/CampaignView";
import { CreativeView } from "@/components/marketing/CreativeView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData } from "@/hooks/marketing/useDashboardData";

export default function MarketingPage() {
  const { data: campaignData, dailyData, creatives, isLoading } = useDashboardData();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-black">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-[#D4AF37]">
          Marketing Analytics
        </h2>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-[#1A1A1A] border border-[#333]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-gray-300">Visão Geral</TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-gray-300">Campanhas</TabsTrigger>
          <TabsTrigger value="creatives" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-gray-300">Criativos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <OverviewView data={campaignData || []} dailyData={dailyData || []} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="campaigns" className="space-y-4">
          <CampaignView data={campaignData || []} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="creatives" className="space-y-4">
          {/* O segredo estava aqui: mudamos de 'creatives=' para 'data=' */}
          <CreativeView data={creatives || []} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}