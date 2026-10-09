// app/(app)/dashboard/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsPanel, clearAnalyticsCache } from "@/components/dashboard/analytics-panel";
import { DashboardSettingsTab } from "@/components/dashboard/dashboard-settings";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WorkQueue } from "@/components/dashboard/work-queue";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import type { DashboardData, DashboardView } from "@/components/dashboard/types";
import { DASH_PANEL, DASH_SURFACE } from "@/components/dashboard/ui";

// Abas em formato de pílula, com a ativa na cor principal.
const TABS_LIST = `h-auto max-w-full justify-start overflow-x-auto rounded-full p-1 ${DASH_SURFACE}`;
const TABS_TRIGGER = "rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none";

// O que cada papel vê primeiro: admin analisa, gerente acompanha a equipe, corretor executa.
const SUBTITLE: Record<DashboardView, string> = {
  admin: "Conversão dos clientes, do cadastro à venda.",
  manager: "Indicadores, tarefas e clientes da sua equipe.",
  broker: "Suas tarefas e os clientes que precisam de atenção.",
};

// Última fila carregada: ao voltar para a página ela aparece na hora e atualiza por trás.
let lastData: DashboardData | null = null;

function OverdueBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium tabular-nums text-destructive-foreground">
      {count}
      <span className="sr-only"> atrasadas</span>
    </span>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[20px]" />)}
      </div>
      <Skeleton className="h-72 w-full rounded-[20px]" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(lastData);
  const [hasError, setHasError] = useState(false);
  // Trocado ao salvar a configuração: remonta as análises com os dados novos.
  const [analyticsKey, setAnalyticsKey] = useState(0);

  const loadData = useCallback(async () => {
    setHasError(false);
    try {
      const res = await dashboardFetch("/api/dashboard/data");
      if (!res.ok) throw new Error();
      lastData = await res.json();
      setData(lastData);
    } catch {
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  if (!user) return null;

  // O admin é conhecido pelo login; gerente e corretor só se distinguem depois da
  // primeira resposta (gerente é o corretor que tem equipe).
  const view: DashboardView | null = data?.view ?? (user.role === "MARKETING_ADMIN" ? "admin" : null);
  const firstName = user.name?.split(" ")[0] ?? "";
  const overdue = data?.totals.overdueTasks ?? 0;

  const loadError = (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Não foi possível carregar tarefas e clientes.</p>
      <Button variant="outline" onClick={loadData}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Tentar de novo
      </Button>
    </div>
  );

  // Com dados já na tela, uma falha ao atualizar não troca a fila pela mensagem de erro.
  const queue = data ? (
    <WorkQueue data={data} currentUserId={user.id} team={data.view === "manager"} onChanged={loadData} />
  ) : hasError ? loadError : <QueueSkeleton />;

  const analytics = view ? <AnalyticsPanel key={analyticsKey} view={view} /> : null;

  return (
    <div className="p-3 md:p-4">
    <div className={`space-y-5 sm:space-y-6 ${DASH_PANEL}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Olá{firstName ? `, ${firstName}` : ""}</h1>
          <p className="text-sm text-muted-foreground">{view ? SUBTITLE[view] : "Carregando seu painel..."}</p>
        </div>
        <QuickActions currentUserId={user.id} brokers={data?.brokers ?? []} canAssignBroker={!!view && view !== "broker"} onChanged={loadData} />
      </div>

      {view === null && (hasError ? loadError : <QueueSkeleton />)}

      {view === "admin" && (
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className={TABS_LIST}>
            <TabsTrigger className={TABS_TRIGGER} value="analytics">Análises</TabsTrigger>
            <TabsTrigger className={TABS_TRIGGER} value="queue">Minhas tarefas<OverdueBadge count={overdue} /></TabsTrigger>
            <TabsTrigger className={TABS_TRIGGER} value="settings">Configurar</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics">{analytics}</TabsContent>
          <TabsContent value="queue">{queue}</TabsContent>
          <TabsContent value="settings">
            <DashboardSettingsTab onSaved={() => { clearAnalyticsCache(); setAnalyticsKey(k => k + 1); }} />
          </TabsContent>
        </Tabs>
      )}

      {view === "manager" && (
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className={TABS_LIST}>
            <TabsTrigger className={TABS_TRIGGER} value="analytics">Indicadores da equipe</TabsTrigger>
            <TabsTrigger className={TABS_TRIGGER} value="queue">Tarefas e clientes<OverdueBadge count={overdue} /></TabsTrigger>
          </TabsList>
          <TabsContent value="analytics">{analytics}</TabsContent>
          <TabsContent value="queue">{queue}</TabsContent>
        </Tabs>
      )}

      {view === "broker" && (
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className={TABS_LIST}>
            <TabsTrigger className={TABS_TRIGGER} value="queue">Meu dia<OverdueBadge count={overdue} /></TabsTrigger>
            <TabsTrigger className={TABS_TRIGGER} value="analytics">Meus números</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">{queue}</TabsContent>
          <TabsContent value="analytics">{analytics}</TabsContent>
        </Tabs>
      )}
    </div>
    </div>
  );
}
