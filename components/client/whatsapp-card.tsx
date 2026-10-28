"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, CalendarClock, Clock, FileText, Image as ImageIcon, MessageCircle, Mic, RefreshCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Mensagem no formato compacto da extensão (lib/ext/conversa.ts). */
type Msg = { id: string; ts: number; lado: ">" | "<"; tipo?: "a" | "i" | "v" | "d"; seg?: number; texto: string };
type Conversa =
  | { vinculada: false }
  | {
      vinculada: true;
      contato: string | null;
      atualizada_em: string;
      ultima_cliente_em: string | null;
      ultima_corretor_em: string | null;
      ultima_lado: ">" | "<" | null;
      prazo: { em: string; nota: string | null } | null;
      mensagens: Msg[];
    };
type Tag = { id: string; name: string; color: string };

const FUSO = "America/Sao_Paulo";

/** "3 min", "5 h", "2 dias" */
function ha(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} dias`;
}

const chaveDia = (ts: number) => new Date(ts * 1000).toLocaleDateString("pt-BR", { timeZone: FUSO });

function rotuloDia(ts: number) {
  const dia = chaveDia(ts);
  if (dia === chaveDia(Date.now() / 1000)) return "Hoje";
  if (dia === chaveDia(Date.now() / 1000 - 86400)) return "Ontem";
  return new Date(ts * 1000).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "numeric", month: "long", year: "numeric" });
}

const hora = (ts: number) => new Date(ts * 1000).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const duracao = (seg?: number) => (seg ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}` : "");

const MIDIA = {
  i: { icone: ImageIcon, rotulo: "Imagem" },
  v: { icone: Video, rotulo: "Vídeo" },
  d: { icone: FileText, rotulo: "Documento" },
} as const;

function Bolha({ m }: { m: Msg }) {
  const minha = m.lado === ">";
  return (
    <div className={cn("flex", minha ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
          minha ? "rounded-br-md border border-[var(--accent-primary)]/40" : "rounded-bl-md bg-muted",
        )}
        style={minha ? { background: "color-mix(in srgb, var(--accent-primary) 16%, transparent)" } : undefined}
      >
        <span className="sr-only">{minha ? "Você" : "Cliente"}: </span>
        {m.tipo === "a" ? (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Mic className="h-3.5 w-3.5" aria-hidden /> Áudio {duracao(m.seg)}
            </span>
            {m.texto ? (
              <p className="whitespace-pre-wrap italic">“{m.texto}”</p>
            ) : (
              <p className="text-xs text-muted-foreground">Sem transcrição (transcreva pela extensão)</p>
            )}
          </div>
        ) : m.tipo ? (
          (() => {
            const { icone: Icone, rotulo } = MIDIA[m.tipo];
            return (
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Icone className="h-3.5 w-3.5" aria-hidden /> {rotulo}
                </span>
                {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
              </div>
            );
          })()
        ) : (
          <p className="whitespace-pre-wrap break-words">{m.texto}</p>
        )}
        <time className="mt-1 block text-right text-[11px] text-muted-foreground" dateTime={new Date(m.ts * 1000).toISOString()}>
          {hora(m.ts)}
        </time>
      </div>
    </div>
  );
}

/**
 * Bloco "WhatsApp" da ficha do cliente: a conversa que a extensão guarda (últimas
 * 80 mensagens), quanto tempo está parada, o prazo do próximo contato e as
 * etiquetas (as mesmas do WhatsApp Business). Só para o administrador.
 */
export function WhatsappCard({ clientId, waPhone, tags, onRia }: { clientId: string; waPhone: string; tags?: Tag[]; onRia?: () => void }) {
  const [dados, setDados] = useState<Conversa | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const rolagem = useRef<HTMLDivElement>(null);

  const carregar = () => {
    setCarregando(true);
    setErro(false);
    fetch(`/api/clients/${clientId}/whatsapp`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDados)
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  };
  useEffect(carregar, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const mensagens = dados?.vinculada ? dados.mensagens : [];
  // agrupa por dia para os separadores
  const grupos = useMemo(() => {
    const out: { dia: string; rotulo: string; msgs: Msg[] }[] = [];
    for (const m of [...mensagens].sort((a, b) => a.ts - b.ts)) {
      const dia = chaveDia(m.ts);
      if (out.at(-1)?.dia !== dia) out.push({ dia, rotulo: rotuloDia(m.ts), msgs: [] });
      out.at(-1)!.msgs.push(m);
    }
    return out;
  }, [mensagens]);

  // abre na mensagem mais recente
  useEffect(() => {
    if (rolagem.current) rolagem.current.scrollTop = rolagem.current.scrollHeight;
  }, [grupos]);

  const vencido = dados?.vinculada && dados.prazo ? Date.parse(dados.prazo.em) <= Date.now() : false;

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-[var(--accent-primary)]"
              style={{ background: "color-mix(in srgb, var(--accent-primary) 16%, transparent)" }}
              aria-hidden
            >
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-lg">WhatsApp</CardTitle>
              <p className="text-xs text-muted-foreground">
                {dados?.vinculada
                  ? `Conversa guardada pela extensão · atualizada há ${ha(dados.atualizada_em)}`
                  : "Conversa guardada pela extensão do WhatsApp Web"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={carregar} disabled={carregando} aria-label="Atualizar a conversa">
            <RefreshCw className={cn("h-4 w-4", carregando && "animate-spin motion-reduce:animate-none")} />
          </Button>
        </div>

        {dados?.vinculada && (
          <div className="flex flex-wrap items-center gap-2" role="status">
            {dados.ultima_lado === "<" && dados.ultima_cliente_em ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Clock className="h-3.5 w-3.5" aria-hidden /> Esperando sua resposta há {ha(dados.ultima_cliente_em)}
              </span>
            ) : dados.ultima_lado === ">" && dados.ultima_corretor_em ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden /> Aguardando o cliente há {ha(dados.ultima_corretor_em)}
              </span>
            ) : null}
            {dados.prazo && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                  vencido ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-muted text-foreground",
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                {vencido ? "Prazo vencido: " : "Próximo contato: "}
                {new Date(dados.prazo.em).toLocaleString("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {dados.prazo.nota ? ` · ${dados.prazo.nota}` : ""}
              </span>
            )}
            {tags?.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />
                {t.name}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {carregando && !dados ? (
          <div className="space-y-3" aria-label="Carregando a conversa">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-12 w-3/5" />
          </div>
        ) : erro ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground" role="alert">
            Não foi possível carregar a conversa. Tente atualizar.
          </p>
        ) : !dados?.vinculada ? (
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            <p>Esta conversa ainda não foi vinculada pela extensão.</p>
            <p className="mt-1">
              Abra o cliente no WhatsApp Web com a extensão e vincule. A conversa passa a aparecer aqui.{" "}
              <Link href="/extensao" className="font-medium text-foreground underline underline-offset-4">Ver a extensão</Link>
            </p>
          </div>
        ) : !mensagens.length ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Nenhuma mensagem guardada ainda.</p>
        ) : (
          <div
            ref={rolagem}
            role="log"
            aria-label="Mensagens da conversa no WhatsApp"
            tabIndex={0}
            className="max-h-[440px] space-y-3 overflow-y-auto overscroll-contain rounded-xl border bg-background/50 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] sm:p-4"
          >
            {grupos.map((g) => (
              <section key={g.dia} aria-label={g.rotulo} className="space-y-2">
                <div className="sticky top-0 z-10 flex justify-center py-1">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">{g.rotulo}</span>
                </div>
                {g.msgs.map((m) => (
                  <Bolha key={m.id} m={m} />
                ))}
              </section>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="h-11 flex-1">
            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Abrir no WhatsApp
            </a>
          </Button>
          {onRia && (
            <Button variant="outline" className="h-11 flex-1" onClick={onRia}>
              <Bot className="mr-2 h-4 w-4 text-secondary-custom" /> Sugestão da RIA
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
