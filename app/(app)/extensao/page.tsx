"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Copy, Download, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { cachedFetch } from "@/lib/api-cache";

type Item = {
  id: string;
  kind: "playbook" | "example";
  situation: string | null;
  answer: string;
  active: boolean;
  source: string;
  createdAt: string;
};
type Stats = { used?: number; edited?: number; ignored?: number; pending?: number; conversas?: number };
type Imovel = { id: string; title: string };

const FONTE: Record<string, string> = { manual: "CRM", faixa: "Faixa", sugestao: "Sugestão" };

/** Mensagem pré-preenchida com "ref.": a faixa reconhece o imóvel e vincula sozinha. */
const mensagemRef = (imovel: Imovel) => `Olá! Tenho interesse no ${imovel.title} (ref. ${imovel.id.slice(0, 6).toUpperCase()})`;

export default function ExtensaoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({});
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [numero, setNumero] = useState("");
  const [imovelId, setImovelId] = useState("");
  const [novo, setNovo] = useState({ tipo: "playbook", situacao: "", resposta: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/extensao");
    if (r.ok) {
      const j = await r.json();
      setStats(j.stats ?? {});
      setItens(j.itens ?? []);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!user?.isSuperAdmin) return;
    carregar();
    cachedFetch("/api/properties")
      .then((r: Response) => (r.ok ? r.json() : []))
      .then((lista: Imovel[]) => setImoveis(Array.isArray(lista) ? lista.map((p) => ({ id: p.id, title: p.title })) : []))
      .catch(() => null);
    try {
      setNumero(localStorage.getItem("ext.numeroWhatsapp") ?? "");
    } catch {}
  }, [user, carregar]);

  const imovel = imoveis.find((i) => i.id === imovelId);
  const link = useMemo(() => {
    const digitos = numero.replace(/\D/g, "");
    if (digitos.length < 12 || !imovel) return "";
    return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagemRef(imovel))}`;
  }, [numero, imovel]);

  if (!user) return null;
  if (!user.isSuperAdmin) {
    return <div className="p-6 text-muted-foreground">A extensão do WhatsApp é exclusiva do administrador.</div>;
  }

  const total = (stats.used ?? 0) + (stats.edited ?? 0) + (stats.ignored ?? 0);
  const semEditar = total ? Math.round(((stats.used ?? 0) / total) * 100) : 0;

  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto);
    toast({ title: "Copiado" });
  };

  const salvarNovo = async () => {
    setSalvando(true);
    const r = await fetch("/api/extensao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    });
    setSalvando(false);
    if (!r.ok) return toast({ title: "Não foi possível salvar", variant: "destructive" });
    setNovo({ tipo: novo.tipo, situacao: "", resposta: "" });
    carregar();
  };

  const alternar = async (item: Item) => {
    setItens((lista) => lista.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i)));
    await fetch("/api/extensao", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ativo: !item.active }),
    });
  };

  const apagar = async (item: Item) => {
    if (!confirm("Apagar este item da base de conhecimento?")) return;
    setItens((lista) => lista.filter((i) => i.id !== item.id));
    await fetch(`/api/extensao?id=${item.id}`, { method: "DELETE" });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 w-full">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">Extensão WhatsApp</h1>
        <Badge variant="destructive">BETA</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instalar</CardTitle>
            <CardDescription>Faixa do Nordic dentro do WhatsApp Web, com a RIA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Button asChild>
              <a href="/extensao/nordic-whatsapp.zip" download>
                <Download className="h-4 w-4 mr-2" /> Baixar a extensão (.zip)
              </a>
            </Button>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Extraia o ZIP numa pasta fixa (ex.: Documentos).</li>
              <li>No Chrome, abra <code className="bg-muted px-1 rounded">chrome://extensions</code> e ligue o <b>Modo do desenvolvedor</b>.</li>
              <li>Clique em <b>Carregar sem compactação</b> e escolha a pasta <b>nordic-whatsapp</b>.</li>
              <li>Com o CRM aberto e logado, abra o <b>web.whatsapp.com</b>: a faixa entra sozinha.</li>
              <li>Para atualizar: baixe de novo, extraia por cima e clique em ↻ na extensão.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Maturidade da RIA</CardTitle>
            <CardDescription>Sugestões dos últimos 30 dias. Quando quase tudo sair sem edição, o bot está pronto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {carregando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-4xl font-bold">{total ? `${semEditar}%` : "—"}</div>
                <p className="text-muted-foreground">enviadas sem editar</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border p-2"><div className="font-semibold">{stats.used ?? 0}</div><div className="text-xs text-muted-foreground">sem editar</div></div>
                  <div className="rounded-md border p-2"><div className="font-semibold">{stats.edited ?? 0}</div><div className="text-xs text-muted-foreground">editadas</div></div>
                  <div className="rounded-md border p-2"><div className="font-semibold">{stats.ignored ?? 0}</div><div className="text-xs text-muted-foreground">ignoradas</div></div>
                </div>
                <p className="text-xs text-muted-foreground">{stats.conversas ?? 0} conversas vinculadas · {stats.pending ?? 0} sugestões aguardando resposta</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Link do WhatsApp com referência do imóvel</CardTitle>
          <CardDescription>
            Use no fim do formulário do Meta e no site. A mensagem já vem com &quot;ref.&quot;: a faixa reconhece o imóvel e liga a conversa ao cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="numero">Seu WhatsApp (com DDI e DDD)</Label>
            <Input
              id="numero"
              placeholder="5511999999999"
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                try { localStorage.setItem("ext.numeroWhatsapp", e.target.value); } catch {}
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Imóvel</Label>
            <Select value={imovelId} onValueChange={setImovelId}>
              <SelectTrigger><SelectValue placeholder="Escolha o imóvel" /></SelectTrigger>
              <SelectContent>
                {imoveis.map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {link && imovel && (
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm text-muted-foreground">Mensagem: {mensagemRef(imovel)}</p>
              <div className="flex gap-2">
                <Input readOnly value={link} className="font-mono text-xs" />
                <Button variant="outline" onClick={() => copiar(link)}><Copy className="h-4 w-4 mr-2" /> Copiar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base de conhecimento da RIA</CardTitle>
          <CardDescription>
            Regras de como você trabalha e exemplos de respostas. A RIA usa tudo o que está ativo, e o bot vai usar a mesma base.
            Também entra aqui o que você marca na faixa como &quot;boa resposta&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto] items-end">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={novo.tipo} onValueChange={(tipo) => setNovo((n) => ({ ...n, tipo }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="playbook">Regra</SelectItem>
                  <SelectItem value="example">Exemplo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="situacao">Situação</Label>
              <Textarea id="situacao" rows={2} value={novo.situacao} onChange={(e) => setNovo((n) => ({ ...n, situacao: e.target.value }))} placeholder="Ex.: cliente pergunta se aceita FGTS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resposta">Resposta ou regra</Label>
              <Textarea id="resposta" rows={2} value={novo.resposta} onChange={(e) => setNovo((n) => ({ ...n, resposta: e.target.value }))} placeholder="Ex.: Aceita sim, na entrada e para amortizar." />
            </div>
            <Button onClick={salvarNovo} disabled={!novo.resposta.trim() || salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Adicionar
            </Button>
          </div>

          {itens.length === 0 && !carregando ? (
            <p className="text-sm text-muted-foreground">Nada ainda. Comece pelas regras: região em que você atua, como agenda visitas, objeções comuns.</p>
          ) : (
            <ul className="divide-y">
              {itens.map((item) => (
                <li key={item.id} className="py-3 flex gap-4 items-start">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex gap-2 items-center text-xs">
                      <Badge variant="secondary">{item.kind === "example" ? "Exemplo" : "Regra"}</Badge>
                      <span className="text-muted-foreground">{FONTE[item.source] ?? item.source} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {item.situation && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.situation}</p>}
                    <p className="text-sm whitespace-pre-wrap">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.active} onCheckedChange={() => alternar(item)} aria-label="Ativo" />
                    <Button variant="ghost" size="icon" onClick={() => apagar(item)} aria-label="Apagar"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
