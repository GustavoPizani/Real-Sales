"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Copy, Download, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
type Registro = {
  chave: string; nome: string | null; telefone: string | null; analisada_em: string; ultima_msg_em: string | null;
  mensagens: number; propostas: number; vezes: number; origem: string; novidades: boolean;
};
type Imovel = { id: string; title: string };

const FONTE: Record<string, string> = { manual: "CRM", faixa: "Faixa", sugestao: "Sugestão", conversas: "Conversas (faixa)", importacao: "Conversas importadas" };

type Proposta = { situacao: string; resposta: string };
type Propostas = { regras: Proposta[]; exemplos: Proposta[] };

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST em /api/extensao; no limite da IA (429) espera o tempo pedido e tenta de novo. */
async function chamar(corpo: object, aoEsperar: (seg: number) => void): Promise<any> {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch("/api/extensao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    if (r.status === 429 && tentativa < 6) {
      const seg = (j.esperarSeg || 30) + 1;
      aoEsperar(seg);
      await dormir(seg * 1000);
      continue;
    }
    throw new Error(j.error || `Erro ${r.status}`);
  }
}

/**
 * Importa o arquivo JSON exportado pela faixa ("Exportar JSON"), a RIA lê cada
 * conversa inteira e propõe regras e exemplos; você escolhe o que entra na base.
 */
function AprenderComConversas({ aoSalvar }: { aoSalvar: () => void }) {
  const { toast } = useToast();
  const [progresso, setProgresso] = useState<{ feito: number; total: number; texto: string } | null>(null);
  const [propostas, setPropostas] = useState<Propostas | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);

  const importar = async (arquivo: File) => {
    let conversas: any[];
    try {
      const j = JSON.parse(await arquivo.text());
      conversas = (Array.isArray(j?.conversas) ? j.conversas : []).filter((c: any) => Array.isArray(c?.mensagens) && c.mensagens.length);
    } catch {
      return toast({ title: "Arquivo inválido", description: "Use o JSON exportado pela faixa do WhatsApp.", variant: "destructive" });
    }
    if (!conversas.length) return toast({ title: "Nenhuma conversa no arquivo", variant: "destructive" });

    setPropostas(null);
    const juntas: Propostas = { regras: [], exemplos: [] };
    try {
      for (let i = 0; i < conversas.length; i++) {
        const c = conversas[i];
        setProgresso({ feito: i, total: conversas.length, texto: `A RIA está lendo ${c.nome || c.telefone || "a conversa"}…` });
        const r = await chamar({ acao: "analisar", conversa: c }, (seg) =>
          setProgresso({ feito: i, total: conversas.length, texto: `Limite da IA: aguardando ${seg} s…` }),
        );
        juntas.regras.push(...r.regras);
        juntas.exemplos.push(...r.exemplos);
      }
      setProgresso({ feito: conversas.length, total: conversas.length, texto: "Juntando o que se repete e tirando o que a base já tem…" });
      const final: Propostas = await chamar({ acao: "consolidar", ...juntas }, (seg) =>
        setProgresso({ feito: conversas.length, total: conversas.length, texto: `Limite da IA: aguardando ${seg} s…` }),
      );
      setPropostas(final);
      setMarcadas(new Set([...final.regras.map((_, i) => `r${i}`), ...final.exemplos.map((_, i) => `e${i}`)]));
      if (!final.regras.length && !final.exemplos.length) toast({ title: "A RIA não achou nada novo nessas conversas." });
    } catch (e: any) {
      toast({ title: "Não foi possível analisar", description: e.message, variant: "destructive" });
    } finally {
      setProgresso(null);
    }
  };

  const alternar = (chave: string) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(chave)) n.delete(chave);
      else n.add(chave);
      return n;
    });

  const salvar = async () => {
    if (!propostas) return;
    setSalvando(true);
    try {
      const r = await chamar(
        {
          acao: "salvar",
          regras: propostas.regras.filter((_, i) => marcadas.has(`r${i}`)),
          exemplos: propostas.exemplos.filter((_, i) => marcadas.has(`e${i}`)),
        },
        () => null,
      );
      toast({ title: `${r.salvos} ${r.salvos === 1 ? "item entrou" : "itens entraram"} na base` });
      setPropostas(null);
      aoSalvar();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const grupo = (titulo: string, prefixo: "r" | "e", lista: Proposta[]) =>
    lista.length > 0 && (
      <div className="space-y-2">
        <p className="text-sm font-semibold">{titulo} ({lista.length})</p>
        {lista.map((p, i) => (
          <label key={i} className="flex gap-3 items-start rounded-md border p-3 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1" checked={marcadas.has(`${prefixo}${i}`)} onChange={() => alternar(`${prefixo}${i}`)} />
            <span>
              {p.situacao && <span className="block text-muted-foreground">{p.situacao}</span>}
              <span className="whitespace-pre-wrap">{p.resposta}</span>
            </span>
          </label>
        ))}
      </div>
    );

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Aprender com conversas</p>
          <p className="text-sm text-muted-foreground">
            Importe o JSON exportado pela faixa (&quot;Exportar JSON&quot;). A RIA lê as conversas inteiras e propõe regras e exemplos; você escolhe o que entra.
          </p>
        </div>
        <Button asChild variant="outline" disabled={!!progresso}>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" /> Importar conversas (.json)
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={!!progresso}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) importar(f);
              }}
            />
          </label>
        </Button>
      </div>

      {progresso && (
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {progresso.texto}</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progresso.total ? (progresso.feito / progresso.total) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progresso.feito} de {progresso.total} conversas</p>
        </div>
      )}

      {propostas && (propostas.regras.length > 0 || propostas.exemplos.length > 0) && (
        <div className="space-y-4">
          {grupo("Regras propostas", "r", propostas.regras)}
          {grupo("Exemplos de resposta", "e", propostas.exemplos)}
          <div className="flex gap-2">
            <Button onClick={salvar} disabled={!marcadas.size || salvando}>
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar {marcadas.size} na base
            </Button>
            <Button variant="ghost" onClick={() => setPropostas(null)}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mensagem pré-preenchida com "ref.": a faixa reconhece o imóvel e vincula sozinha. */
const mensagemRef = (imovel: Imovel) => `Olá! Tenho interesse no ${imovel.title} (ref. ${imovel.id.slice(0, 6).toUpperCase()})`;

export default function ExtensaoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({});
  const [registro, setRegistro] = useState<Registro[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [numero, setNumero] = useState("");
  const [imovelId, setImovelId] = useState("");

  const carregar = useCallback(async () => {
    const r = await fetch("/api/extensao");
    if (r.ok) {
      const j = await r.json();
      setStats(j.stats ?? {});
      setRegistro(j.registro ?? []);
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
          <CardTitle>Conversas já usadas para aprender</CardTitle>
          <CardDescription>
            Cada conversa que a RIA já leu, pela faixa ou por importação. &quot;Mensagens novas&quot; aparece quando a conversa
            recebeu mensagens depois da análise (a faixa avisa ao listar as conversas): vale analisar de novo para atualizar o contexto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registro.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conversa usada ainda.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {registro.length} conversa{registro.length === 1 ? "" : "s"} · {registro.filter((r) => r.novidades).length} com mensagens novas
              </p>
              <ul className="divide-y max-h-[420px] overflow-y-auto">
                {registro.map((r) => (
                  <li key={r.chave} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.nome || r.telefone || "Conversa"}</p>
                      <p className="text-xs text-muted-foreground">
                        Usada em {new Date(r.analisada_em).toLocaleDateString("pt-BR")}
                        {r.vezes > 1 ? ` (${r.vezes} vezes)` : ""} · {r.mensagens} mensagens · {r.propostas} propostas ·{" "}
                        {r.origem === "importacao" ? "JSON importado" : r.origem === "zip" ? "ZIP do WhatsApp" : "pela faixa"}
                      </p>
                    </div>
                    {r.novidades ? (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">Mensagens novas</Badge>
                    ) : (
                      <Badge variant="secondary">Em dia</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base de conhecimento da RIA</CardTitle>
          <CardDescription>
            Regras de como você trabalha e exemplos de respostas, tirados das suas conversas. A RIA usa tudo o que está ativo, e o bot vai usar a mesma base.
            Também entra aqui o que você marca na faixa como &quot;boa resposta&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AprenderComConversas aoSalvar={carregar} />

          {itens.length === 0 && !carregando ? (
            <p className="text-sm text-muted-foreground">Nada ainda. Importe conversas exportadas pela faixa, ou use &quot;Aprender com conversas&quot; direto no WhatsApp Web.</p>
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
