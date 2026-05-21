"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Bot, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

type Agent = {
  id: string;
  name: string;
  model: string;
  temperature: number;
  isDefault: boolean;
  _count: { conversations: number };
};

export default function AgentsListPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAgents(data);
      })
      .catch((err) => {
        toast({ title: "Erro ao carregar agentes", description: err.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Agentes IA</h2>
        <div className="flex items-center space-x-2">
          <Link href="/marketing/agents/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Novo Agente
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="text-muted-foreground">Carregando agentes...</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 rounded-xl border border-dashed border-border p-8">
          <Bot className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-medium">Nenhum Agente Configurado</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Crie seu primeiro agente de IA para qualificar leads e interagir com clientes automaticamente.
          </p>
          <Link href="/marketing/agents/new">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
              <Plus className="mr-2 h-4 w-4" /> Criar Agente
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold">{agent.name}</CardTitle>
                <Bot className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Modelo</span>
                    <span className="font-medium">{agent.model}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Temperatura</span>
                    <span className="font-medium">{agent.temperature}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Conversas</span>
                    <span className="font-medium">{agent._count?.conversations || 0}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                {agent.isDefault ? (
                  <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
                    Padrão
                  </Badge>
                ) : (
                  <span />
                )}
                <Link href={`/marketing/agents/${agent.id}`}>
                  <Button variant="ghost" size="sm" className="hover:text-primary hover:bg-primary/10">
                    <Settings2 className="mr-2 h-4 w-4" /> Configurar
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
