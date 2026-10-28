// lib/ext/aprender.ts
// "Aprender com conversas": a RIA lê conversas inteiras (exportadas pela faixa
// em JSON, formato nordic-conversas-v1) e propõe regras e exemplos de como o
// corretor trabalha, além de um histórico de cada conversa. Nada é gravado aqui:
// as propostas voltam para revisão e só entram na base quando aceitas.
import { prisma } from '@/lib/prisma';
import { conversaEmTexto, type MsgWa } from './conversa';
import { ErroExt } from './auth';
import { groq } from './ria';

/** Uma conversa no arquivo exportado (ver extensao/painel.js, exportar). */
export interface ConversaExport {
  chat_id?: string;
  nome?: string;
  telefone?: string;
  historico_completo?: boolean;
  /** total da conversa quando ela chega em partes (conversas longas são lidas em pedaços) */
  total_mensagens?: number;
  mensagens: { id?: string; data: string; de: 'corretor' | 'cliente'; tipo?: string; duracao_seg?: number; texto?: string }[];
}

export interface Proposta { situacao: string; resposta: string }
export interface Propostas { regras: Proposta[]; exemplos: Proposta[] }

const TIPOS: Record<string, MsgWa['tipo']> = { audio: 'a', imagem: 'i', video: 'v', documento: 'd' };
const MAX_MSGS = 400;
const MAX_CHARS = 45_000;

/** Converte para o formato interno, mantendo só o fim da conversa se for grande demais para a IA. */
function paraMsgs(c: ConversaExport): MsgWa[] {
  const msgs = (Array.isArray(c.mensagens) ? c.mensagens : [])
    .map((m, i) => ({
      id: String(m.id ?? i),
      ts: Math.floor(Date.parse(m.data) / 1000),
      lado: (m.de === 'corretor' ? '>' : '<') as MsgWa['lado'],
      ...(m.tipo && TIPOS[m.tipo] ? { tipo: TIPOS[m.tipo] } : {}),
      texto: String(m.texto ?? '').slice(0, 2000),
    }))
    .filter((m) => m.ts > 0)
    .sort((a, b) => a.ts - b.ts)
    .slice(-MAX_MSGS);
  let total = 0;
  let inicio = msgs.length;
  while (inicio > 0 && total + msgs[inicio - 1].texto.length + 40 <= MAX_CHARS) total += msgs[--inicio].texto.length + 40;
  return msgs.slice(inicio);
}

/** Tira dados pessoais antes de mandar para a IA: nome do contato, telefones, e-mails, CPF. */
function anonimizar(texto: string, nome?: string): string {
  let t = texto
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[telefone]');
  for (const parte of String(nome ?? '').split(/\s+/).filter((p) => p.length >= 3)) {
    t = t.replace(new RegExp(`\\b${parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '[cliente]');
  }
  return t;
}

const lista = (v: unknown, max: number): Proposta[] =>
  (Array.isArray(v) ? v : [])
    .filter((x: any) => typeof x?.resposta === 'string' && x.resposta.trim())
    .slice(0, max)
    .map((x: any) => ({ situacao: String(x.situacao ?? '').trim().slice(0, 600), resposta: String(x.resposta).trim().slice(0, 1500) }));

function lerJson(texto: string) {
  try {
    return JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
  } catch {
    throw new ErroExt(502, 'A IA respondeu num formato inesperado. Tente de novo.');
  }
}

/** Lê uma conversa inteira: histórico resumido + regras e exemplos propostos. */
export async function analisarConversa(c: ConversaExport): Promise<Propostas & { historico: string; pulada?: string }> {
  const msgs = paraMsgs(c);
  if (msgs.length < 4) return { historico: '', regras: [], exemplos: [], pulada: 'conversa curta demais' };
  if (!msgs.some((m) => m.lado === '>' && m.texto.trim())) {
    return { historico: '', regras: [], exemplos: [], pulada: 'sem mensagens suas para aprender' };
  }
  const conversa = anonimizar(conversaEmTexto(msgs, msgs.length), c.nome);

  const texto = await groq({
    messages: [
      {
        role: 'system',
        content: `Você analisa uma conversa de WhatsApp entre um corretor de imóveis ("Você") e um cliente, para ensinar uma assistente de IA a atender do jeito DESTE corretor.

Extraia:
1. "historico": resumo da conversa para o CRM (interesse, perfil — região, dormitórios, vagas, faixa de preço, momento de compra, forma de pagamento —, objeções, o que foi combinado e em que pé ficou). Até 8 linhas.
2. "regras": como o corretor trabalha, de forma geral e reaproveitável para outros clientes: como abre a conversa, que perguntas faz para qualificar e em que ordem, como conduz para a visita, como responde objeções, informações do negócio que ele afirma (condições, regiões, documentos, processo). Cada regra: {"situacao": "quando…", "resposta": "o que ele faz/diz"}. Até 8. Não invente: só o que a conversa mostra.
3. "exemplos": até 4 trechos em que a resposta do corretor foi boa (fez o cliente avançar). {"situacao": "o que o cliente disse", "resposta": "o texto do corretor, copiado como ele escreveu"}.

Nunca inclua nome, telefone, e-mail ou documento do cliente: use [cliente]. Escreva em português do Brasil.
Responda só com JSON: {"historico": "...", "regras": [...], "exemplos": [...]}`,
      },
      { role: 'user', content: conversa },
    ],
    temperature: 0.2,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });
  const j = lerJson(texto);
  return { historico: String(j.historico ?? '').trim(), regras: lista(j.regras, 8), exemplos: lista(j.exemplos, 4) };
}

/** Junta as propostas de várias conversas: tira repetidas e o que a base já tem. */
export async function consolidar(accountId: string, propostas: Propostas): Promise<Propostas> {
  const regras = lista(propostas.regras, 400);
  const exemplos = lista(propostas.exemplos, 200);
  if (!regras.length && !exemplos.length) return { regras: [], exemplos: [] };

  const base = await prisma.knowledgeItem.findMany({
    where: { accountId, active: true },
    orderBy: { updatedAt: 'desc' },
    take: 80,
    select: { kind: true, situation: true, answer: true },
  });
  const linha = (p: { situacao?: string | null; resposta: string }) => `- ${p.situacao ? `${p.situacao} → ` : ''}${p.resposta}`;
  const ja = base.map((b) => linha({ situacao: b.situation, resposta: b.answer })).join('\n');

  const texto = await groq({
    messages: [
      {
        role: 'system',
        content: `Você organiza a base de conhecimento de um corretor de imóveis. Recebe REGRAS e EXEMPLOS propostos a partir de várias conversas e o que a BASE ATUAL já tem.

- Junte regras que dizem a mesma coisa numa só, mais clara e geral. Mantenha a ordem de importância (o que aparece em mais conversas primeiro).
- Tire o que a BASE ATUAL já cobre e o que for específico de um único cliente.
- Nos exemplos, fique com os melhores e mais variados; mantenha o texto do corretor como ele escreveu.
- Até 30 regras e 15 exemplos. Formato de cada item: {"situacao": "...", "resposta": "..."}.
Responda só com JSON: {"regras": [...], "exemplos": [...]}`,
      },
      {
        role: 'user',
        content: `BASE ATUAL:\n${ja || '(vazia)'}\n\nREGRAS PROPOSTAS:\n${regras.map(linha).join('\n') || '(nenhuma)'}\n\nEXEMPLOS PROPOSTOS:\n${exemplos.map(linha).join('\n') || '(nenhum)'}`.slice(0, 90_000),
      },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });
  const j = lerJson(texto);
  return { regras: lista(j.regras, 30), exemplos: lista(j.exemplos, 15) };
}

/** Grava as propostas aceitas na base de conhecimento. */
export async function salvarPropostas(accountId: string, userId: string, aceitas: Propostas, source: string) {
  const dados = [
    ...lista(aceitas.regras, 100).map((p) => ({ kind: 'playbook', ...p })),
    ...lista(aceitas.exemplos, 100).map((p) => ({ kind: 'example', ...p })),
  ].map((p) => ({ accountId, userId, kind: p.kind, situation: p.situacao || null, answer: p.resposta, source }));
  if (!dados.length) throw new ErroExt(400, 'Nenhum item escolhido.');
  const r = await prisma.knowledgeItem.createMany({ data: dados });
  return { salvos: r.count };
}

// ── registro das conversas já usadas ────────────────────────────────────────
/** Chave da conversa no registro: id do WhatsApp; sem ele, telefone ou nome. */
export function chaveConversa(c: Pick<ConversaExport, 'chat_id' | 'telefone' | 'nome'>): string | null {
  if (c.chat_id) return String(c.chat_id).slice(0, 120);
  const tel = String(c.telefone ?? '').replace(/\D/g, '');
  if (tel.length >= 8) return `tel:${tel}`;
  const nome = String(c.nome ?? '').trim().toLowerCase();
  return nome ? `nome:${nome.slice(0, 100)}` : null;
}

/** Marca a conversa como usada (ou usada de novo) pela RIA. */
export async function registrarConversa(accountId: string, userId: string, c: ConversaExport, propostas: number, source: string) {
  const chave = chaveConversa(c);
  if (!chave) return;
  const datas = (c.mensagens ?? []).map((m) => Date.parse(m.data)).filter((t) => t > 0);
  const ultima = datas.length ? new Date(Math.max(...datas)) : null;
  const dados = {
    nome: c.nome?.slice(0, 120) || null,
    telefone: c.telefone?.slice(0, 30) || null,
    analyzedAt: new Date(),
    lastMessageAt: ultima,
    messages: c.total_mensagens ?? c.mensagens?.length ?? 0,
    proposals: propostas,
    source,
  };
  await prisma.learnedConversation.upsert({
    where: { accountId_chave: { accountId, chave } },
    create: { accountId, userId, chave, ...dados },
    update: { ...dados, timesUsed: { increment: 1 } },
  });
}

/**
 * Registro das conversas usadas. atividade = última mensagem que a faixa vê em
 * cada conversa agora (segundos): se for mais nova que a analisada, a conversa
 * tem mensagens novas.
 */
export async function registroConversas(accountId: string, atividade?: { chat_id: string; t: number }[]) {
  if (Array.isArray(atividade) && atividade.length) {
    const porChave = new Map(
      atividade.filter((a) => a?.chat_id && Number(a.t) > 0).slice(0, 1000).map((a) => [String(a.chat_id), new Date(Number(a.t) * 1000)]),
    );
    const existentes = await prisma.learnedConversation.findMany({
      where: { accountId, chave: { in: Array.from(porChave.keys()) } },
      select: { id: true, chave: true, lastActivityAt: true },
    });
    for (const r of existentes) {
      const t = porChave.get(r.chave)!;
      if (!r.lastActivityAt || t > r.lastActivityAt) {
        await prisma.learnedConversation.update({ where: { id: r.id }, data: { lastActivityAt: t } });
      }
    }
  }
  const lista = await prisma.learnedConversation.findMany({ where: { accountId }, orderBy: { analyzedAt: 'desc' }, take: 1000 });
  return lista.map((r) => ({
    chave: r.chave,
    nome: r.nome,
    telefone: r.telefone,
    analisada_em: r.analyzedAt,
    ultima_msg_em: r.lastMessageAt,
    ultima_atividade_em: r.lastActivityAt,
    mensagens: r.messages,
    propostas: r.proposals,
    vezes: r.timesUsed,
    origem: r.source,
    // mensagens depois da que foi analisada (1 min de folga para relógios diferentes)
    novidades: Boolean(r.lastActivityAt && r.lastMessageAt && r.lastActivityAt.getTime() > r.lastMessageAt.getTime() + 60_000),
  }));
}
