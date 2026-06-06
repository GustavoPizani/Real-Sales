"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  QrCode, RefreshCw, CheckCircle2, AlertCircle, Plus, Play,
  Trash2, Upload, Users, Send, Clock, Settings2,
  Zap, MessageSquare, Info, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type Agent = {
  id: string;
  name: string;
  model: string;
  temperature: number;
  isDefault: boolean;
  _count: { conversations: number };
};

interface Broadcast {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
  messageTemplate: string;
  limitPerRun: number;
  startHour: number;
  endHour: number;
  delayMin: number;
  delayMax: number;
  aiEnabled: boolean;
  aiSystemPrompt?: string;
  lastRunAt: string | null;
  createdAt: string;
  stats: { total: number; sent: number; failed: number; pending: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  PAUSED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  FINISHED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho", ACTIVE: "Ativa", PAUSED: "Pausada", FINISHED: "Concluída",
};

// ─── WhatsApp Connection Section (compartilhado entre SDR e Disparador) ──────

type WaStatus = "IDLE" | "NOT_CREATED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "STOPPED" | "ERROR" | "NOT_CONFIGURED";

function WhatsAppConnectionSection({ onStatusChange }: { onStatusChange?: (s: WaStatus) => void }) {
  const [waStatus, setWaStatus] = useState<WaStatus>("IDLE");
  const [modalOpen, setModalOpen] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [connecting, setConnecting] = useState(false);

  const checkWaStatus = useCallback(async (): Promise<WaStatus> => {
    try {
      const res = await fetch("/api/sessions/waha/status");
      if (res.ok) {
        const data = await res.json();
        const s = data.status as WaStatus;
        setWaStatus(s);
        onStatusChange?.(s);
        return s;
      }
    } catch {}
    return "ERROR";
  }, [onStatusChange]);

  // Polling global de status (sempre ativo)
  useEffect(() => {
    checkWaStatus();
    const id = setInterval(checkWaStatus, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fecha modal automaticamente ao conectar
  useEffect(() => {
    if (waStatus === "WORKING" && modalOpen) {
      const t = setTimeout(() => setModalOpen(false), 1500);
      return () => clearTimeout(t);
    }
  }, [waStatus, modalOpen]);

  // Atualiza QR a cada 15s enquanto modal aberto e em SCAN_QR_CODE
  useEffect(() => {
    if (!modalOpen || waStatus !== "SCAN_QR_CODE") return;
    const id = setInterval(() => setQrTimestamp(Date.now()), 15000);
    return () => clearInterval(id);
  }, [modalOpen, waStatus]);

  // Polling acelerado (2s) enquanto modal aberto e em STARTING
  useEffect(() => {
    if (!modalOpen || waStatus !== "STARTING") return;
    const id = setInterval(checkWaStatus, 2000);
    return () => clearInterval(id);
  }, [modalOpen, waStatus, checkWaStatus]);

  const handleConnect = async () => {
    setModalOpen(true);
    setConnecting(true);
    setWaStatus("STARTING");
    try {
      const res = await fetch("/api/sessions/waha/ensure", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.status) {
        setWaStatus("ERROR");
        return;
      }
      const s = data.status as WaStatus;
      setWaStatus(s);
      setQrTimestamp(Date.now());
    } catch {
      setWaStatus("ERROR");
    } finally {
      setConnecting(false);
    }
  };

  const isConnected = waStatus === "WORKING";

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 hover:border-secondary-custom/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-secondary-custom flex items-center gap-2">
              <QrCode className="w-5 h-5" /> Conexão WhatsApp
            </CardTitle>
            <CardDescription>Número usado pelo Agente SDR e pelo Disparador.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            {isConnected ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-secondary-custom mx-auto" />
                <p className="text-lg font-bold text-secondary-custom">Conectado!</p>
                <p className="text-sm text-muted-foreground">WhatsApp pronto para SDR e disparos.</p>
                <Button variant="outline" size="sm" onClick={handleConnect} className="text-xs mt-2">
                  <RefreshCw className="w-3 h-3 mr-1" /> Trocar número
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <AlertCircle className="w-14 h-14 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">WhatsApp não conectado.</p>
                <Button onClick={handleConnect} className="bg-secondary-custom text-white hover:bg-secondary-custom/80">
                  <QrCode className="mr-2 h-4 w-4" /> Conectar WhatsApp
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-secondary-custom/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-secondary-custom text-base">Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. <strong>Número exclusivo:</strong> use um chip dedicado, não o seu pessoal.</p>
            <p>2. <strong>Agente SDR:</strong> responde automaticamente a leads com IA.</p>
            <p>3. <strong>Disparador:</strong> envia mensagens em massa com delay humanizado.</p>
            <p>4. Se desconectar, clique em Conectar novamente para gerar novo QR.</p>
          </CardContent>
        </Card>
      </div>

      {/* Modal do QR Code */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-secondary-custom">
              <QrCode className="w-5 h-5" /> Conectar WhatsApp
            </DialogTitle>
            <DialogDescription className="sr-only">Escaneie o QR Code pelo WhatsApp</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-4 space-y-4">
            {(connecting || waStatus === "STARTING") && (
              <>
                <RefreshCw className="w-12 h-12 text-secondary-custom animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">Gerando QR Code...</p>
              </>
            )}

            {waStatus === "SCAN_QR_CODE" && (
              <>
                <div className="bg-white p-3 rounded-xl inline-block shadow-md">
                  <img
                    key={qrTimestamp}
                    src={`/api/sessions/waha/qr?t=${qrTimestamp}`}
                    alt="QR Code"
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  WhatsApp → <strong>⋮</strong> → Dispositivos Conectados → Conectar novo
                </p>
                <Button variant="outline" size="sm" onClick={() => setQrTimestamp(Date.now())} className="text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Gerar novo QR
                </Button>
              </>
            )}

            {waStatus === "WORKING" && (
              <>
                <CheckCircle2 className="w-16 h-16 text-secondary-custom" />
                <p className="text-lg font-bold text-secondary-custom">Conectado!</p>
              </>
            )}

            {waStatus === "ERROR" && (
              <>
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-sm text-muted-foreground text-center">Falha ao conectar. Tente novamente.</p>
                <Button onClick={handleConnect} size="sm" className="bg-secondary-custom text-white">
                  Tentar novamente
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Agente SDR Tab ───────────────────────────────────────────────────────────

function AgenteSdrTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAgents(data); })
      .finally(() => setAgentsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agentes IA</h3>
          <p className="text-sm text-muted-foreground">Configure o comportamento do SDR para cada campanha</p>
        </div>
        <Link href="/marketing/whatsapp/agents/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Novo Agente
          </Button>
        </Link>
      </div>

      {agentsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed space-y-4">
          <Bot className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Nenhum agente configurado. Crie um para que o Bot SDR saiba como qualificar leads.
          </p>
          <Link href="/marketing/whatsapp/agents/new">
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Criar Agente
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => (
            <Card key={agent.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">{agent.name}</CardTitle>
                <Bot className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Modelo", value: agent.model },
                  { label: "Temperatura", value: agent.temperature },
                  { label: "Conversas", value: agent._count?.conversations || 0 },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-3">
                {agent.isDefault
                  ? <Badge className="bg-primary/20 text-primary border-0 text-xs">Padrão</Badge>
                  : <span />}
                <Link href={`/marketing/whatsapp/agents/${agent.id}`}>
                  <Button variant="ghost" size="sm" className="hover:text-primary hover:bg-primary/10 text-xs">
                    <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Configurar
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

// ─── SpintaxEditor ───────────────────────────────────────────────────────────

const VARIABLES = [
  { label: "{{nome}}", description: "primeiro nome" },
  { label: "{{nome_completo}}", description: "nome completo" },
];

function SpintaxEditor({
  value, onChange, preview,
}: {
  value: string;
  onChange: (v: string) => void;
  preview: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function insertSpintax() {
    insertAtCursor("{opção 1|opção 2}");
  }

  // Spintax regex — ignora {{variavel}}, só captura {opção1|opção2}
  // Estratégia: mascara {{...}} antes de aplicar a regex de spintax
  const SPINTAX_RE = /\{([^{}]+)\}/g;
  function maskVars(text: string): [string, string[]] {
    const vars: string[] = [];
    const masked = text.replace(/\{\{[^{}]+\}\}/g, m => { vars.push(m); return `\x00${vars.length - 1}\x00`; });
    return [masked, vars];
  }
  function restoreVars(text: string, vars: string[]): string {
    return text.replace(/\x00(\d+)\x00/g, (_, i) => vars[parseInt(i)]);
  }

  // Parse spintax blocks for the visual explainer
  const blocks = value.split("\n").map(line => {
    const [maskedLine, vars] = maskVars(line);
    const rawMatches = [...maskedLine.matchAll(SPINTAX_RE)];
    if (rawMatches.length === 0) return { type: "text" as const, line };
    // Restore vars inside each match
    const matches = rawMatches.map(m => ({
      ...m,
      1: restoreVars(m[1], vars),
    }));
    return { type: "spintax" as const, line, matches };
  });

  return (
    <div className="space-y-3">
      {/* How it works explainer */}
      <div className="rounded-lg bg-muted/40 border border-dashed px-3 py-2 space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Como funciona o Spintax</p>
        <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="font-mono bg-background border rounded px-1 text-secondary-custom">{"{opção1|opção2}"}</span>
            <span>= sorteia uma variação aleatória por disparo</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          <span className="text-xs text-muted-foreground">Exemplo:</span>
          <span className="font-mono text-xs bg-background border rounded px-1.5 py-0.5">{"{Olá|Oi|E aí}"}</span>
          <span className="text-xs text-muted-foreground">→ cada pessoa recebe uma saudação diferente</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Inserir:</span>
        <button
          type="button"
          onClick={insertSpintax}
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-mono hover:bg-muted transition-colors text-secondary-custom border-secondary-custom/30"
        >
          {"{opção1|opção2}"}
        </button>
        <span className="text-xs text-muted-foreground">|</span>
        {VARIABLES.map(v => (
          <button
            key={v.label}
            type="button"
            onClick={() => insertAtCursor(v.label)}
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-mono hover:bg-muted transition-colors"
            title={v.description}
          >
            {v.label}
            <span className="text-muted-foreground font-sans">{v.description}</span>
          </button>
        ))}
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={5}
        placeholder={`{Olá {{nome}}|Oi {{nome}}, tudo bem?}\n{Aqui é o Gustavo, da Pizani.|Sou o Gustavo da Pizani Imóveis.}\n\nVi que você buscou informações sobre o Prado Paulista.\n{Ainda está avaliando opções?|O que falta para ser o imóvel ideal?}`}
        className="font-mono text-sm"
      />

      {/* Block-by-block spintax breakdown */}
      {value && (
        <div className="rounded-lg border border-dashed p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground mb-2">Blocos de variação detectados:</p>
          {blocks.map((block, i) => {
            if (block.type === "text") {
              return block.line.trim() ? (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground font-medium">fixo</span>
                  <span className="text-muted-foreground font-mono">{block.line}</span>
                </div>
              ) : <div key={i} className="h-1" />;
            }
            return (
              <div key={i} className="space-y-1">
                {block.matches.map((match, j) => {
                  const options = match[1].split("|");
                  return (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5 shrink-0 rounded bg-secondary-custom/15 px-1.5 py-0.5 text-secondary-custom font-medium">
                        {options.length} opções
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {options.map((opt, k) => (
                          <span key={k} className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-foreground">
                            {opt.replace(/\{\{nome\}\}/gi, "João").replace(/\{\{nome_completo\}\}/gi, "João Silva")}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="border-t pt-2 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Preview (1ª variação):</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{preview}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ConfigNode ───────────────────────────────────────────────────────────────

function ConfigNode({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        <Icon className="w-4 h-4" />{label}
      </div>
      {children}
    </div>
  );
}

// ─── Broadcast Form Dialog ────────────────────────────────────────────────────

function BroadcastFormDialog({
  open, onClose, initial, onSave,
}: {
  open: boolean; onClose: () => void; initial?: Broadcast | null;
  onSave: (data: Partial<Broadcast>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [limitPerRun, setLimitPerRun] = useState(15);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [delayRange, setDelayRange] = useState([60, 190]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setTemplate(initial?.messageTemplate ?? "");
      setLimitPerRun(initial?.limitPerRun ?? 15);
      setStartHour(initial?.startHour ?? 9);
      setEndHour(initial?.endHour ?? 18);
      setDelayRange([initial?.delayMin ?? 60, initial?.delayMax ?? 190]);
      setAiEnabled(initial?.aiEnabled ?? false);
      setAiPrompt(initial?.aiSystemPrompt ?? "");
    }
  }, [open, initial]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name, messageTemplate: template, limitPerRun, startHour, endHour,
      delayMin: delayRange[0], delayMax: delayRange[1],
      aiEnabled, aiSystemPrompt: aiEnabled ? aiPrompt : undefined,
    });
    setSaving(false);
  };

  const preview = (() => {
    const vars: string[] = [];
    const masked = template.replace(/\{\{[^{}]+\}\}/g, m => { vars.push(m); return `\x00${vars.length - 1}\x00`; });
    const spintaxed = masked.replace(/\{([^{}]+)\}/g, (_, g) => g.split("|")[0]);
    const restored = spintaxed.replace(/\x00(\d+)\x00/g, (_, i) => vars[parseInt(i)]);
    return restored
      .replace(/\{\{nome\}\}/gi, "João")
      .replace(/\{\{nome_completo\}\}/gi, "João Silva");
  })();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Campanha" : "Nova Campanha de Disparo"}</DialogTitle>
          <DialogDescription className="sr-only">Configure a campanha de disparo WhatsApp</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <ConfigNode label="Identificação" icon={MessageSquare}>
            <div className="space-y-1">
              <Label>Nome da campanha</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Reengajamento Prado Paulista" />
            </div>
          </ConfigNode>

          <ConfigNode label="Mensagem" icon={Send}>
            <SpintaxEditor value={template} onChange={setTemplate} preview={preview} />
          </ConfigNode>

          <div className="grid grid-cols-2 gap-4">
            <ConfigNode label="Horário Permitido" icon={Clock}>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="number" min={0} max={23} value={startHour} onChange={e => setStartHour(+e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <Input type="number" min={0} max={23} value={endHour} onChange={e => setEndHour(+e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Disparos entre {startHour}h e {endHour}h</p>
            </ConfigNode>

            <ConfigNode label="Limite por Execução" icon={Zap}>
              <div className="space-y-1">
                <Label className="text-xs">Máx. contatos por rodada</Label>
                <Input type="number" min={1} max={100} value={limitPerRun} onChange={e => setLimitPerRun(+e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">{limitPerRun} mensagens por rodada</p>
            </ConfigNode>
          </div>

          <ConfigNode label="Delay entre Mensagens" icon={Settings2}>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Mínimo (segundos)</Label>
                <Input type="number" min={10} max={600} value={delayRange[0]}
                  onChange={e => setDelayRange([+e.target.value, delayRange[1]])} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Máximo (segundos)</Label>
                <Input type="number" min={10} max={600} value={delayRange[1]}
                  onChange={e => setDelayRange([delayRange[0], +e.target.value])} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Intervalo aleatório entre <strong>{delayRange[0]}s</strong> e <strong>{delayRange[1]}s</strong>
              {" "}(~{Math.round(delayRange[0]/60)}–{Math.round(delayRange[1]/60)} min)
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> Delays maiores reduzem risco de bloqueio
            </p>
          </ConfigNode>

          <ConfigNode label="Agente IA (Facultativo)" icon={Bot}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Ativar respostas automáticas</Label>
                <p className="text-xs text-muted-foreground">
                  Quando o contato responder, o Groq responde até qualificá-lo
                </p>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>
            {aiEnabled && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm">Prompt do Agente</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={5}
                  placeholder={`Você é um assistente de vendas imobiliárias da Pizani Imóveis.\nSeu objetivo é validar se o lead ainda tem interesse no Prado Paulista e coletar: nome completo, melhor horário para contato e se já conhece o empreendimento.\nSeja breve, amigável e profissional. Não invente informações sobre o imóvel.\nQuando coletar essas informações, chame qualify_lead.`}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  O agente só entra quando o contato <strong>responder</strong> à mensagem disparada
                </p>
              </div>
            )}
          </ConfigNode>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name || !template || (aiEnabled && !aiPrompt) || saving}>
            {saving ? "Salvando..." : "Salvar Campanha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contact Upload Dialog ────────────────────────────────────────────────────

function ContactUploadDialog({
  open, onClose, broadcastId, onUploaded,
}: { open: boolean; onClose: () => void; broadcastId: string; onUploaded: () => void }) {
  const { toast } = useToast();
  const [raw, setRaw] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseContacts = (text: string) =>
    text.split("\n").map(line => {
      const parts = line.split(/[,;\t]/);
      const name = parts.length >= 2 ? parts[0].trim() : undefined;
      const phone = (parts.length >= 2 ? parts[1] : parts[0]).trim();
      return phone ? { name, phone } : null;
    }).filter(Boolean) as { name?: string; phone: string }[];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setRaw(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    const contacts = parseContacts(raw);
    if (contacts.length === 0) return toast({ title: "Nenhum contato válido", variant: "destructive" });
    setUploading(true);
    try {
      const res = await fetch(`/api/whatsapp/broadcasts/${broadcastId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      const data = await res.json();
      toast({ title: "Contatos importados", description: `${data.added} adicionados, ${data.skipped} duplicatas ignoradas.` });
      setRaw(""); onUploaded(); onClose();
    } catch {
      toast({ title: "Erro ao importar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const preview = parseContacts(raw);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Contatos</DialogTitle>
          <DialogDescription>Cole a lista ou faça upload de um CSV.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Formato: <code className="bg-muted px-1 rounded">Nome, Telefone</code> ou só <code className="bg-muted px-1 rounded">Telefone</code> — uma linha por contato
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Carregar CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs"
              onClick={() => {
                const csv = "Nome,Telefone\nJoão Silva,11987654321\nMaria Souza,11912345678\n11999998888,\n";
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "modelo_contatos.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Baixar modelo CSV
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          <Textarea
            placeholder={"João Silva, 11987654321\nMaria, 11912345678\n11999998888"}
            rows={8} value={raw} onChange={e => setRaw(e.target.value)} className="font-mono text-sm"
          />
          {preview.length > 0 && <p className="text-sm text-muted-foreground">{preview.length} contatos detectados</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={uploading || preview.length === 0}>
            {uploading ? "Importando..." : `Importar ${preview.length} contatos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Broadcast Card ───────────────────────────────────────────────────────────

function BroadcastCard({ broadcast, onEdit, onDelete, onRun, onUploadContacts }: {
  broadcast: Broadcast; onEdit: () => void; onDelete: () => void;
  onRun: () => void; onUploadContacts: () => void;
}) {
  const progress = broadcast.stats.total > 0
    ? Math.round((broadcast.stats.sent / broadcast.stats.total) * 100) : 0;

  return (
    <Card className="border hover:border-secondary-custom/40 transition-colors">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{broadcast.name}</h3>
              <Badge className={`text-xs border ${STATUS_COLORS[broadcast.status]}`}>
                {STATUS_LABELS[broadcast.status]}
              </Badge>
              {broadcast.aiEnabled && (
                <Badge className="text-xs border bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Bot className="w-3 h-3 mr-1" /> IA
                </Badge>
              )}
            </div>
            {broadcast.lastRunAt && (
              <p className="text-xs text-muted-foreground">
                Último disparo: {new Date(broadcast.lastRunAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Total", value: broadcast.stats.total, color: "text-foreground" },
            { label: "Enviados", value: broadcast.stats.sent, color: "text-green-500" },
            { label: "Pendentes", value: broadcast.stats.pending, color: "text-yellow-500" },
            { label: "Falhas", value: broadcast.stats.failed, color: "text-red-500" },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-2">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {broadcast.stats.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-secondary-custom transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {broadcast.startHour}h–{broadcast.endHour}h</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {broadcast.limitPerRun}/rodada</span>
          <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" /> {broadcast.delayMin}–{broadcast.delayMax}s</span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onUploadContacts} className="flex-1">
            <Users className="w-4 h-4 mr-1" /> Contatos
          </Button>
          <Button size="sm" onClick={onRun}
            disabled={broadcast.status === "FINISHED" || broadcast.stats.pending === 0}
            className="flex-1 bg-secondary-custom text-white hover:bg-secondary-custom/80">
            <Play className="w-4 h-4 mr-1" />
            {broadcast.status === "FINISHED" ? "Concluída" : "Disparar Agora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Disparador Tab ───────────────────────────────────────────────────────────

function DisparadorTab({ wahaWorking }: { wahaWorking: boolean }) {
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Broadcast | null>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/broadcasts");
      const data = await res.json();
      setBroadcasts(data.broadcasts ?? []);
    } catch {
      toast({ title: "Erro ao carregar campanhas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  const handleSave = async (formData: Partial<Broadcast>) => {
    try {
      if (editing) {
        await fetch(`/api/whatsapp/broadcasts/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
        });
        toast({ title: "Campanha atualizada" });
      } else {
        await fetch("/api/whatsapp/broadcasts", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
        });
        toast({ title: "Campanha criada" });
      }
      setFormOpen(false); setEditing(null); fetchBroadcasts();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta campanha e todos os contatos?")) return;
    await fetch(`/api/whatsapp/broadcasts/${id}`, { method: "DELETE" });
    toast({ title: "Campanha excluída" }); fetchBroadcasts();
  };

  const handleRun = async (id: string) => {
    try {
      const res = await fetch(`/api/whatsapp/broadcasts/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (data.skipped) toast({ title: "Fora do horário", description: data.error, variant: "destructive" });
      else if (data.finished) toast({ title: "Campanha concluída!" });
      else toast({ title: "Disparo executado", description: `${data.sent} enviados · ${data.failed} falhas · ${data.remaining} restantes` });
      fetchBroadcasts();
    } catch {
      toast({ title: "Erro ao disparar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {!wahaWorking && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>WhatsApp não conectado — conecte acima antes de disparar.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campanhas de Disparo</h3>
          <p className="text-sm text-muted-foreground">Disparos em massa com delay humanizado, spintax e agente IA opcional</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="bg-secondary-custom text-white hover:bg-secondary-custom/80">
          <Plus className="w-4 h-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p><strong>Spintax:</strong> <code className="bg-muted px-1 rounded">{"{opção1|opção2}"}</code> — variações aleatórias por mensagem</p>
            <p><strong>Variáveis:</strong> <code className="bg-muted px-1 rounded">{"{{nome}}"}</code> — primeiro nome do contato</p>
            <p><strong>Agente IA:</strong> responde automaticamente quando o contato responder (configurável por campanha)</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : broadcasts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma campanha criada ainda.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeira campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {broadcasts.map(b => (
            <BroadcastCard key={b.id} broadcast={b}
              onEdit={() => { setEditing(b); setFormOpen(true); }}
              onDelete={() => handleDelete(b.id)}
              onRun={() => handleRun(b.id)}
              onUploadContacts={() => setUploadTarget(b.id)}
            />
          ))}
        </div>
      )}

      <BroadcastFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing} onSave={handleSave} />
      {uploadTarget && (
        <ContactUploadDialog open={!!uploadTarget} onClose={() => setUploadTarget(null)}
          broadcastId={uploadTarget} onUploaded={fetchBroadcasts} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("sdr");
  const [wahaWorking, setWahaWorking] = useState(false);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">WhatsApp</h2>
        <p className="text-muted-foreground">Gerencie o Agente SDR e os disparos em massa</p>
      </div>

      {/* Conexão compartilhada — serve tanto o SDR quanto o Disparador */}
      <WhatsAppConnectionSection onStatusChange={s => setWahaWorking(s === "WORKING")} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="sdr" className="flex items-center gap-2">
            <Bot className="w-4 h-4" /> Agente SDR
          </TabsTrigger>
          <TabsTrigger value="disparador" className="flex items-center gap-2">
            <Send className="w-4 h-4" /> Disparador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sdr"><AgenteSdrTab /></TabsContent>
        <TabsContent value="disparador">
          <DisparadorTab wahaWorking={wahaWorking} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
