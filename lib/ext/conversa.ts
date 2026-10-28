// lib/ext/conversa.ts
// Mensagens da faixa: formato compacto, janela das últimas 80 e o que aconteceu
// com cada sugestão da RIA (comparando com o que você enviou depois dela).
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Mensagem no formato compacto da faixa (ver extensao/ponte.js). */
export interface MsgWa {
  id: string;
  ts: number; // segundos
  lado: '>' | '<'; // ">" você, "<" cliente
  tipo?: 'a' | 'i' | 'v' | 'd'; // áudio, imagem, vídeo, documento; sem tipo = texto
  seg?: number;
  texto: string;
}

export const JANELA = 80;

export function limparMensagens(entrada: unknown): MsgWa[] {
  if (!Array.isArray(entrada)) return [];
  const tipos = new Set(['a', 'i', 'v', 'd']);
  return entrada
    .filter((m) => m && typeof m.id === 'string' && Number(m.ts) > 0 && (m.lado === '>' || m.lado === '<'))
    .slice(-500)
    .map((m) => ({
      id: String(m.id).slice(0, 120),
      ts: Math.floor(Number(m.ts)),
      lado: m.lado,
      ...(tipos.has(m.tipo) ? { tipo: m.tipo } : {}),
      ...(m.tipo === 'a' && Number(m.seg) > 0 ? { seg: Math.round(Number(m.seg)) } : {}),
      texto: String(m.texto ?? '').slice(0, 4000),
    }));
}

/** Junta as novas às guardadas sem perder transcrições; fica com as últimas 80. */
export function juntar(guardadas: MsgWa[], novas: MsgWa[]): MsgWa[] {
  const porId = new Map(guardadas.map((m) => [m.id, m]));
  for (const m of novas) {
    const antiga = porId.get(m.id);
    // áudio já transcrito: a faixa manda o áudio sem texto, o banco tem a transcrição
    porId.set(m.id, antiga?.tipo === 'a' && antiga.texto && !m.texto ? { ...m, texto: antiga.texto } : m);
  }
  return Array.from(porId.values()).sort((a, b) => a.ts - b.ts).slice(-JANELA);
}

export function resumoTempos(msgs: MsgWa[]) {
  const ultCli = [...msgs].reverse().find((m) => m.lado === '<');
  const ultEu = [...msgs].reverse().find((m) => m.lado === '>');
  return {
    lastClientAt: ultCli ? new Date(ultCli.ts * 1000) : null,
    lastBrokerAt: ultEu ? new Date(ultEu.ts * 1000) : null,
    lastSide: msgs.at(-1)?.lado ?? null,
  };
}

/** Conversa em texto para o prompt (últimas n). */
export function conversaEmTexto(msgs: MsgWa[], n = 30): string {
  const rotulo = { a: 'áudio', i: 'imagem', v: 'vídeo', d: 'documento' } as const;
  return msgs
    .slice(-n)
    .map((m) => {
      const quem = m.lado === '>' ? 'Você' : 'Cliente';
      const data = new Date(m.ts * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const tipo = m.tipo ? `[${rotulo[m.tipo]}${m.tipo === 'a' && !m.texto ? ' sem transcrição' : ''}] ` : '';
      return `[${data}] ${quem}: ${tipo}${m.texto.replace(/\n+/g, ' ')}`;
    })
    .join('\n');
}

// ── resultado das sugestões ─────────────────────────────────────────────────
const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Parecença entre dois textos (0 a 1), por pares de palavras. */
function parecenca(a: string, b: string): number {
  const pares = (s: string) => {
    const p = normalizar(s).split(' ');
    const out = new Map<string, number>();
    for (let i = 0; i < p.length; i++) {
      const k = i + 1 < p.length ? `${p[i]} ${p[i + 1]}` : p[i];
      out.set(k, (out.get(k) ?? 0) + 1);
    }
    return out;
  };
  const x = pares(a);
  const y = pares(b);
  let comum = 0;
  let total = 0;
  x.forEach((n, k) => { comum += Math.min(n, y.get(k) ?? 0); total += n; });
  y.forEach((n) => { total += n; });
  return total ? (2 * comum) / total : 0;
}

/**
 * Para cada sugestão pendente da conversa, a primeira mensagem de texto que você
 * enviou depois dela decide o resultado: igual à escolhida (ou a qualquer opção)
 * = "used"; escolheu e mudou = "edited"; não escolheu e escreveu outra = "ignored".
 */
export async function resolverSugestoes(linkId: string, msgs: MsgWa[]) {
  const pendentes = await prisma.aiSuggestion.findMany({
    where: { linkId, outcome: 'pending', createdAt: { gt: new Date(Date.now() - 2 * 864e5) } },
    orderBy: { createdAt: 'asc' },
  });
  for (const s of pendentes) {
    const desde = s.createdAt.getTime() / 1000;
    const enviada = msgs.find((m) => m.lado === '>' && !m.tipo && m.ts >= desde - 5 && m.texto.trim());
    if (!enviada) continue;
    const opcoes = (s.options as { texto: string }[]) ?? [];
    const escolhida = s.chosenIndex != null ? opcoes[s.chosenIndex]?.texto : undefined;
    const melhor = Math.max(0, ...opcoes.map((o) => parecenca(o.texto, enviada.texto)));
    const outcome =
      (escolhida && parecenca(escolhida, enviada.texto) >= 0.9) || melhor >= 0.9
        ? 'used'
        : escolhida
          ? 'edited'
          : 'ignored';
    await prisma.aiSuggestion.update({
      where: { id: s.id },
      data: { outcome, sentText: enviada.texto, resolvedAt: new Date() },
    });
  }
}

export const jsonMsgs = (msgs: MsgWa[]) => msgs as unknown as Prisma.InputJsonValue;

/** Últimos dígitos do telefone, para achar o cliente (o nono dígito e o DDI variam). */
export const sufixoTelefone = (tel: string) => tel.replace(/\D/g, '').slice(-8);
