// app/(app)/integrations/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Slack, Calendar, Mail, Zap, Database } from "lucide-react";
import React, { useState, useEffect } from "react";

const integrationsList = [
  { id: 1, name: "Slack", description: "Receba notificações de novos leads e tarefas.", icon: Slack, category: "Communication", apiPath: "slack" },
  { id: 2, name: "Google Calendar", description: "Sincronize tarefas e visitas com sua agenda.", icon: Calendar, category: "Productivity", apiPath: "google" },
  { id: 3, name: "HubSpot", description: "Sincronize contatos e negócios com o HubSpot.", icon: Database, category: "CRM", apiPath: "hubspot" },
  { id: 4, name: "Zapier", description: "Conecte com mais de 5000 apps via Zapier.", icon: Zap, category: "Automation", apiPath: "zapier" },
  { id: 5, name: "Gmail", description: "Rastreie e sincronize conversas de e-mail.", icon: Mail, category: "Email", apiPath: "gmail" },
];

export default function IntegrationsPage() {
    // Estado para rastrear integrações conectadas (será preenchido pela API na Fase 3)
    const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());

    const handleConnect = (apiPath: string) => {
        // Redireciona para a rota de conexão OAuth2
        window.location.href = `/api/integrations/${apiPath}/connect`;
    };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">Conecte suas ferramentas favoritas e otimize seu fluxo de trabalho.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input placeholder="Buscar integrações..." className="pl-10" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrationsList.map((integration) => {
          const isConnected = connectedIntegrations.has(integration.name.toLowerCase());
          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <integration.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{integration.category}</Badge>
                    </div>
                  </div>
                  {isConnected && <Badge className="bg-green-100 text-green-800">Conectado</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 h-10">{integration.description}</CardDescription>
                <Button className="w-full" variant={isConnected ? "outline" : "default"} onClick={() => !isConnected && handleConnect(integration.apiPath)}>
                  {isConnected ? "Gerenciar" : "Conectar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}