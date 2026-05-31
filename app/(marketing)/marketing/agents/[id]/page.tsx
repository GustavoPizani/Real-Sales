"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, MessageCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

type DestinationData = {
  funnels: { id: string; name: string; stages: { id: string; name: string }[] }[];
  roulettes: { id: string; name: string }[];
};

export default function EditAgentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [destinations, setDestinations] = useState<DestinationData | null>(null);
  const [wahaStatus, setWahaStatus] = useState<string>("IDLE");

  useEffect(() => {
    fetch("/api/sessions/waha/status")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data?.status && setWahaStatus(data.status))
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    model: "llama3-70b-8192",
    temperature: 0.3,
    isDefault: false,
    initiationStrategy: "",
    qualificationBoundary: "",
    targetFunnelStage: "",
    systemPrompt: "",
  });

  useEffect(() => {
    fetch("/api/agents/destinations")
      .then((res) => res.json())
      .then((data) => setDestinations(data))
      .catch((err) => console.error("Error fetching destinations:", err));

    fetch(`/api/agents/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Agent not found");
        return res.json();
      })
      .then((data) => {
        setFormData({
          name: data.name || "",
          model: data.model || "llama3-70b-8192",
          temperature: data.temperature ?? 0.3,
          isDefault: data.isDefault || false,
          initiationStrategy: data.initiationStrategy || "",
          qualificationBoundary: data.qualificationBoundary || "",
          targetFunnelStage: data.targetFunnelStage || "",
          systemPrompt: data.systemPrompt || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
        router.push("/marketing/agents");
      });
  }, [params.id, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Erro ao salvar agente");
      
      toast({ title: "Agente atualizado com sucesso!" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja deletar este agente?")) return;
    try {
      const res = await fetch(`/api/agents/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
      toast({ title: "Agente deletado" });
      router.push("/marketing/agents");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <form onSubmit={handleSubmit} className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <Link href="/marketing/agents">
            <Button type="button" variant="outline" size="icon" className="bg-transparent hover:text-primary hover:border-primary">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Editar: {formData.name}</h2>
        </div>
        <div className="flex space-x-2">
          <Button type="button" variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Deletar
          </Button>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="mr-2 h-4 w-4" /> Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <CardTitle className="text-primary">Identidade da Persona</CardTitle>
            <CardDescription>Configurações básicas do modelo e comportamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Agente</Label>
              <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label>Modelo Groq</Label>
              <Select value={formData.model} onValueChange={(v) => setFormData({ ...formData, model: v })}>
                <SelectTrigger className="focus:ring-primary">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llama3-70b-8192">Llama 3 70B (Recomendado)</SelectItem>
                  <SelectItem value="llama3-8b-8192">Llama 3 8B (Rápido)</SelectItem>
                  <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                  <SelectItem value="gemma2-9b-it">Gemma 2 9B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Temperatura ({formData.temperature})</Label>
              <Input type="number" min="0" max="1" step="0.1" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })} className="focus-visible:ring-primary" />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch checked={formData.isDefault} onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })} id="edit-is-default" />
              <Label htmlFor="edit-is-default">Definir como agente padrão</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <CardTitle className="text-primary">Destino no CRM</CardTitle>
            <CardDescription>Para onde enviar o lead após qualificação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Estágio do Funil / Roleta Alvo</Label>
              <Select value={formData.targetFunnelStage} onValueChange={(v) => setFormData({ ...formData, targetFunnelStage: v })}>
                <SelectTrigger className="focus:ring-primary">
                  <SelectValue placeholder="Selecione o destino do lead" />
                </SelectTrigger>
                <SelectContent>
                  {destinations?.funnels?.map((funnel) => (
                    <SelectGroup key={funnel.id}>
                      <SelectLabel className="bg-muted">{funnel.name}</SelectLabel>
                      {funnel.stages.map((stage) => (
                        <SelectItem key={`stage:${stage.id}`} value={`stage:${stage.id}`}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  {destinations?.roulettes && destinations.roulettes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="bg-muted">Roletas de Corretores</SelectLabel>
                      {destinations.roulettes.map((roulette) => (
                        <SelectItem key={`roulette:${roulette.id}`} value={`roulette:${roulette.id}`}>
                          {roulette.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prompt do Sistema</Label>
              <Textarea rows={6} value={formData.systemPrompt} onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })} className="focus-visible:ring-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <CardTitle className="text-primary">Estratégia de Abordagem</CardTitle>
            <CardDescription>Como iniciar a conversa (Outbound/Inbound).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Diretrizes de Abordagem</Label>
              <Textarea rows={6} value={formData.initiationStrategy} onChange={(e) => setFormData({ ...formData, initiationStrategy: e.target.value })} className="focus-visible:ring-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/50">
          <CardHeader>
            <CardTitle className="text-primary">Teto da Automação</CardTitle>
            <CardDescription>Barreira de qualificação (Até onde ir).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Limite de Atuação</Label>
              <Textarea rows={6} value={formData.qualificationBoundary} onChange={(e) => setFormData({ ...formData, qualificationBoundary: e.target.value })} className="focus-visible:ring-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Canal WhatsApp (SDR)
            </CardTitle>
            <CardDescription>O agente opera via WhatsApp. Conecte o número antes de ativar.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {wahaStatus === "WORKING" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-500 font-medium">WhatsApp conectado e operando</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">WhatsApp não conectado</span>
                </>
              )}
            </div>
            <Link href="/marketing/whatsapp">
              <Button type="button" variant="outline" className="border-secondary-custom text-secondary-custom hover:bg-secondary-custom hover:text-white">
                <MessageCircle className="mr-2 h-4 w-4" /> Conectar WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
