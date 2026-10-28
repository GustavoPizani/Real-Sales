// lib/ext/ria.ts
// A RIA dentro do WhatsApp Web: sugestões de resposta (só com imóveis do
// catálogo e no seu jeito de responder), resumo da conversa para as anotações
// e transcrição de áudio. Usa a GROQ_API_KEY do servidor.
import { prisma } from '@/lib/prisma';
import { GROQ_MODEL, reasoningOptions } from '@/lib/llm/models';
import { conversaEmTexto, type MsgWa } from './conversa';
import { ErroExt } from './auth';
import { lerJsonTolerante } from './json-tolerante';

const GROQ = 'https://api.groq.com/openai/v1';

/**
 * O plano grátis do Groq aceita 8 mil tokens por minuto por modelo, e um pedido
 * sozinho (entrada + max_tokens) não pode passar disso. Português dá uns 3,5
 * caracteres por token: cada pedido fica perto de 6 mil tokens.
 */
export const LIMITE_CHARS = { catalogo: 6000, playbook: 3000, exemplos: 3000, conversa: 7000 };
const corta = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}\n…` : s);
/** Fica com o fim do texto (o mais recente) quando passa do limite. */
const cortaInicio = (s: string, max: number) => (s.length > max ? `…\n${s.slice(-max)}` : s);
const MODELO_AUDIO = 'whisper-large-v3-turbo';

const STATUS = { LANCAMENTO: 'lançamento', EM_OBRAS: 'em obras', PRONTO: 'pronto' } as const;
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// Catálogo: uma linha por imóvel. Muda pouco: guarda 10 min.
let catalogo: { texto: string; ate: number } | null = null;
async function catalogoTexto(): Promise<string> {
  if (catalogo && catalogo.ate > Date.now()) return catalogo.texto;
  const imoveis = await prisma.property.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 80,
    select: {
      title: true, address: true, price: true, status: true, type: true,
      propertyTypes: { select: { name: true, value: true, area: true, dormitorios: true, suites: true, vagas: true } },
    },
  });
  const texto = imoveis
    .map((p) => {
      const tipologias = p.propertyTypes
        .map((t) => [t.name, t.area && `${t.area} m²`, t.dormitorios && `${t.dormitorios} dorm`, t.suites && `${t.suites} suíte`, t.vagas && `${t.vagas} vaga`, t.value > 0 && `a partir de ${reais(t.value)}`].filter(Boolean).join(' '))
        .join('; ');
      return [p.title, p.address, STATUS[p.status], p.type, !tipologias && p.price ? `a partir de ${reais(p.price)}` : '', tipologias].filter(Boolean).join(' | ');
    })
    .join('\n');
  catalogo = { texto: texto || '(nenhum imóvel cadastrado)', ate: Date.now() + 10 * 60_000 };
  return catalogo.texto;
}

/** Ficha do cliente no CRM, em texto. */
async function fichaCliente(clientId: string | null): Promise<string> {
  if (!clientId) return 'Cliente ainda não cadastrado no CRM.';
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      fullName: true, campaignSource: true, createdAt: true,
      funnelStage: { select: { name: true } },
      propertyOfInterest: { select: { title: true } },
      notes: { orderBy: { createdAt: 'desc' }, take: 5, select: { content: true, createdAt: true } },
      tasks: { where: { isCompleted: false }, orderBy: { dateTime: 'asc' }, take: 3, select: { title: true, dateTime: true } },
    },
  });
  if (!c) return 'Cliente ainda não cadastrado no CRM.';
  const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return [
    `Nome: ${c.fullName}`,
    `Etapa no funil: ${c.funnelStage.name}`,
    c.propertyOfInterest && `Imóvel de interesse: ${c.propertyOfInterest.title}`,
    c.campaignSource && `Origem: ${c.campaignSource}`,
    `Cliente desde: ${data(c.createdAt)}`,
    c.notes.length && `Anotações recentes:\n${c.notes.map((n) => `- (${data(n.createdAt)}) ${n.content.slice(0, 400)}`).join('\n')}`,
    c.tasks.length && `Tarefas abertas:\n${c.tasks.map((t) => `- ${t.title} (${data(t.dateTime)})`).join('\n')}`,
  ].filter(Boolean).join('\n');
}

/** Playbook e exemplos (os seus e as sugestões que você corrigiu antes de enviar). */
async function baseConhecimento(accountId: string): Promise<{ playbook: string; exemplos: string }> {
  const [itens, corrigidas] = await Promise.all([
    prisma.knowledgeItem.findMany({
      where: { accountId, active: true },
      orderBy: { updatedAt: 'desc' },
      take: 60,
      select: { kind: true, situation: true, answer: true },
    }),
    prisma.aiSuggestion.findMany({
      where: { accountId, outcome: 'edited', sentText: { not: null } },
      orderBy: { resolvedAt: 'desc' },
      take: 8,
      select: { context: true, sentText: true },
    }),
  ]);
  const playbook = itens
    .filter((i) => i.kind === 'playbook')
    .map((i) => `- ${i.situation ? `${i.situation}: ` : ''}${i.answer}`)
    .join('\n');
  const exemplos = [
    ...itens.filter((i) => i.kind === 'example').slice(0, 15).map((i) => ({ s: i.situation, r: i.answer })),
    ...corrigidas.map((c) => ({ s: c.context, r: c.sentText! })),
  ]
    .map((e) => `Cliente: ${(e.s ?? '').slice(0, 300)}\nVocê respondeu: ${e.r.slice(0, 600)}`)
    .join('\n---\n');
  return { playbook, exemplos };
}

// No Groq o limite (por minuto e por dia) é por modelo: quando o principal manda
// esperar muito, o pedido vai para o reserva, que tem cota própria.
const MODELO_RESERVA = 'openai/gpt-oss-20b';
const ESPERA_MAXIMA_SEG = 20;

export async function groq(corpo: Record<string, unknown>) {
  if (!process.env.GROQ_API_KEY) throw new ErroExt(503, 'GROQ_API_KEY não configurada no servidor.');
  const modelos = Array.from(new Set([GROQ_MODEL, MODELO_RESERVA]));
  let r!: Response;
  for (let i = 0; i < modelos.length; i++) {
    const modelo = modelos[i];
    r = await fetch(`${GROQ}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelo, ...reasoningOptions(modelo), ...corpo }),
    });
    const ultimo = i === modelos.length - 1;
    if (r.status === 429 && !ultimo && (Number(r.headers.get('retry-after')) || 30) > ESPERA_MAXIMA_SEG) {
      console.warn(`[EXT_RIA] ${modelo} no limite (espera ${r.headers.get('retry-after')} s): usando ${modelos[i + 1]}`);
      continue;
    }
    break;
  }
  if (r.status === 413) {
    console.error('[EXT_RIA] Groq 413', (await r.text()).slice(0, 300));
    throw new ErroExt(413, 'O pedido passou do limite da IA (8 mil tokens por minuto no plano grátis do Groq). Tente com menos conversa.');
  }
  if (r.status === 429) {
    const seg = Number(r.headers.get('retry-after')) || 30;
    throw new ErroExt(429, `Limite da IA atingido. Tente de novo em ${seg} s.`, seg);
  }
  if (!r.ok) {
    const corpoErro = await r.text();
    // JSON com defeito (em geral cortado no fim): o Groq recusa, mas devolve o que
    // o modelo escreveu; o leitor tolerante aproveita até o último item completo
    try {
      const e = JSON.parse(corpoErro)?.error;
      if (e?.code === 'json_validate_failed' && typeof e.failed_generation === 'string') {
        console.warn('[EXT_RIA] Groq json_validate_failed: aproveitando a resposta parcial');
        return e.failed_generation as string;
      }
    } catch {
      /* não era JSON */
    }
    console.error('[EXT_RIA] Groq', r.status, corpoErro.slice(0, 500));
    throw new ErroExt(502, 'A IA não respondeu. Tente de novo.');
  }
  const j = await r.json();
  return String(j.choices?.[0]?.message?.content ?? '');
}

export interface Sugestao { texto: string; porque: string }

/** Três respostas prontas para a conversa, com uma análise curta. */
export async function sugerir(params: {
  accountId: string;
  clientId: string | null;
  mensagens: MsgWa[];
  pedido?: string;
}): Promise<{ analise: string; sugestoes: Sugestao[] }> {
  const [catalogo, ficha, base] = await Promise.all([
    catalogoTexto(),
    fichaCliente(params.clientId),
    baseConhecimento(params.accountId),
  ]);

  const sistema = `Você é a RIA, assistente do corretor de imóveis dono deste CRM. Você escreve respostas de WhatsApp que ELE vai revisar e enviar ao cliente, com a voz dele.

Objetivo do atendimento: entender o que o cliente procura e levar a conversa para uma VISITA AGENDADA (em lançamentos, visita ao estande/decorado; em imóveis do QuintoAndar, o agendamento é pelo link da vitrine do corretor).

Regras:
1. Só cite imóveis do CATÁLOGO abaixo, com o nome exato. Nunca invente preço, metragem, disponibilidade ou condição.
2. Leia na conversa: região, dormitórios, vagas, teto de preço, pronto ou lançamento, momento de compra. Priorize o que o cliente pediu.
3. Valores só como referência ("a partir de"). Não ofereça acima do teto do cliente.
4. Se nada do catálogo atende, diga com sinceridade e ofereça o mais próximo explicando a diferença.
5. Mensagens curtas, naturais, em português do Brasil, como no WhatsApp. Uma pergunta por vez. Sem formalidade excessiva.
6. Siga o PLAYBOOK e imite o tom dos EXEMPLOS do corretor.
7. Responda só com JSON: {"analise":"1 a 2 frases sobre o momento do cliente e o próximo passo","sugestoes":[{"texto":"mensagem pronta","porque":"motivo curto"}]} com exatamente 3 sugestões diferentes entre si.

CATÁLOGO:
${corta(catalogo, LIMITE_CHARS.catalogo)}

PLAYBOOK DO CORRETOR:
${corta(base.playbook, LIMITE_CHARS.playbook) || '(vazio)'}

EXEMPLOS DE COMO O CORRETOR RESPONDE:
${corta(base.exemplos, LIMITE_CHARS.exemplos) || '(nenhum ainda)'}`;

  const usuario = `FICHA DO CLIENTE NO CRM:
${ficha}

CONVERSA (mais recente por último):
${cortaInicio(conversaEmTexto(params.mensagens, 30), 3500) || '(sem mensagens)'}
${params.pedido ? `\nPEDIDO DO CORRETOR PARA ESTA RESPOSTA: ${params.pedido}` : ''}`;

  const texto = await groq({
    messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }],
    temperature: 0.6,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });
  try {
    const j = lerJsonTolerante(texto);
    if (!j) throw new Error('formato');
    const sugestoes = (Array.isArray(j.sugestoes) ? j.sugestoes : [])
      .filter((s: any) => typeof s?.texto === 'string' && s.texto.trim())
      .slice(0, 3)
      .map((s: any) => ({ texto: s.texto.trim(), porque: String(s.porque ?? '').trim() }));
    if (!sugestoes.length) throw new Error('vazio');
    return { analise: String(j.analise ?? '').trim(), sugestoes };
  } catch {
    throw new ErroExt(502, 'A IA respondeu num formato inesperado. Tente de novo.');
  }
}

/** Resumo da conversa para salvar nas anotações do cliente. */
export async function resumir(mensagens: MsgWa[], nomeCliente: string): Promise<string> {
  if (!mensagens.length) throw new ErroExt(400, 'Não há mensagens para resumir.');
  const texto = await groq({
    messages: [
      {
        role: 'system',
        content: `Você resume conversas de WhatsApp entre um corretor de imóveis ("Você") e um cliente, para a anotação do CRM. Escreva em português, objetivo, sem inventar nada, neste formato (omita linhas sem informação):
Interesse: ...
Perfil: região, dormitórios, vagas, faixa de preço, momento de compra, forma de pagamento
Objeções/dúvidas: ...
Combinado: ...
Próximo passo: ...`,
      },
      { role: 'user', content: `Cliente: ${nomeCliente}\n\n${cortaInicio(conversaEmTexto(mensagens, 80), 15000)}` },
    ],
    temperature: 0.2,
    max_tokens: 900,
  });
  return texto.trim();
}

/** Transcreve um áudio do WhatsApp (ogg/opus) com o Whisper do Groq. */
export async function transcrever(audio: Blob): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new ErroExt(503, 'GROQ_API_KEY não configurada no servidor.');
  const fd = new FormData();
  fd.append('file', audio, 'audio.ogg');
  fd.append('model', MODELO_AUDIO);
  fd.append('language', 'pt');
  fd.append('response_format', 'json');
  const r = await fetch(`${GROQ}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: fd,
  });
  if (r.status === 429) throw new ErroExt(429, 'Limite de transcrição atingido. Tente de novo em instantes.');
  if (!r.ok) {
    console.error('[EXT_RIA] Whisper', r.status, (await r.text()).slice(0, 300));
    throw new ErroExt(502, 'Não foi possível transcrever o áudio.');
  }
  return String((await r.json()).text ?? '').trim();
}
