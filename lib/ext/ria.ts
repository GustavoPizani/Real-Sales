// lib/ext/ria.ts
// A RIA dentro do WhatsApp Web: sugestões de resposta (só com imóveis do
// catálogo e no seu jeito de responder), resumo da conversa para as anotações
// e transcrição de áudio. Usa a GROQ_API_KEY do servidor.
import { prisma } from '@/lib/prisma';
import { GROQ_MODEL, reasoningOptions } from '@/lib/llm/models';
import { conversaEmTexto, situacaoNoTempo, type MsgWa } from './conversa';
import { perfilDaConta } from './perfil';
import { ErroExt } from './auth';
import { lerJsonTolerante } from './json-tolerante';

const GROQ = 'https://api.groq.com/openai/v1';

/**
 * O plano grátis do Groq aceita 8 mil tokens por minuto por modelo, e um pedido
 * sozinho (entrada + max_tokens) não pode passar disso. Português dá uns 3,5
 * caracteres por token: cada pedido fica perto de 6 mil tokens.
 */
const corta = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}\n…` : s);
/** Fica com o fim do texto (o mais recente) quando passa do limite. */
const cortaInicio = (s: string, max: number) => (s.length > max ? `…\n${s.slice(-max)}` : s);
const MODELO_AUDIO = 'whisper-large-v3-turbo';

const STATUS = { LANCAMENTO: 'lançamento', EM_OBRAS: 'em obras', PRONTO: 'pronto' } as const;
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// Catálogo: uma linha por imóvel. Muda pouco: guarda 10 min.
type ImovelCatalogo = { id: string; titulo: string; linha: string };
let catalogo: { linhas: ImovelCatalogo[]; ate: number } | null = null;
async function catalogoLinhas(): Promise<ImovelCatalogo[]> {
  if (catalogo && catalogo.ate > Date.now()) return catalogo.linhas;
  const imoveis = await prisma.property.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 120,
    select: {
      id: true, title: true, address: true, price: true, status: true, type: true,
      propertyTypes: { select: { name: true, value: true, area: true, dormitorios: true, suites: true, vagas: true } },
    },
  });
  const linhas = imoveis.map((p) => {
    const tipologias = p.propertyTypes
      .map((t) => [t.name, t.area && `${t.area} m²`, t.dormitorios && `${t.dormitorios} dorm`, t.suites && `${t.suites} suíte`, t.vagas && `${t.vagas} vaga`, t.value > 0 && `a partir de ${reais(t.value)}`].filter(Boolean).join(' '))
      .join('; ');
    const linha = `- ${[p.title, p.address, STATUS[p.status], p.type, !tipologias && p.price ? `a partir de ${reais(p.price)}` : '', tipologias].filter(Boolean).join(' | ')}`;
    return { id: p.id, titulo: p.title, linha };
  });
  catalogo = { linhas, ate: Date.now() + 10 * 60_000 };
  return linhas;
}

/** Ficha do cliente no CRM, em texto (e o imóvel de interesse, para priorizar no catálogo). */
async function fichaCliente(clientId: string | null): Promise<{ texto: string; imovel: string | null }> {
  if (!clientId) return { texto: 'Cliente ainda não cadastrado no CRM.', imovel: null };
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      fullName: true, campaignSource: true, createdAt: true, overallStatus: true,
      funnelStage: { select: { name: true } },
      propertyOfInterest: { select: { title: true } },
      notes: { orderBy: { createdAt: 'desc' }, take: 5, select: { content: true, createdAt: true } },
      tasks: { where: { isCompleted: false }, orderBy: { dateTime: 'asc' }, take: 3, select: { title: true, dateTime: true } },
      sales: { select: { saleValue: true, propertyName: true, property: { select: { title: true } } } },
    },
  });
  if (!c) return { texto: 'Cliente ainda não cadastrado no CRM.', imovel: null };
  const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const texto = [
    `Nome: ${c.fullName.trim()}`,
    `Etapa no funil: ${c.funnelStage.name}${c.overallStatus === 'WON' ? ' (cliente que já comprou)' : c.overallStatus === 'LOST' ? ' (marcado como perdido)' : ''}`,
    c.propertyOfInterest && `Imóvel de interesse: ${c.propertyOfInterest.title}`,
    c.sales.length && `Já comprou com o corretor: ${c.sales.map((s) => `${s.property?.title ?? s.propertyName} (${reais(s.saleValue)})`).join('; ')}`,
    c.campaignSource && `Origem: ${c.campaignSource}`,
    `Cliente desde: ${data(c.createdAt)}`,
    c.notes.length && `Anotações (mais recentes primeiro):\n${c.notes.map((n) => `- (${data(n.createdAt)}) ${n.content.replace(/\s+/g, ' ').slice(0, 300)}`).join('\n')}`,
    c.tasks.length && `Tarefas abertas:\n${c.tasks.map((t) => `- ${t.title} (${data(t.dateTime)})`).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n');
  return { texto, imovel: c.propertyOfInterest?.title ?? null };
}

/** Regras e exemplos ativos, mais as sugestões que você corrigiu antes de enviar. */
async function itensDaBase(accountId: string): Promise<{ playbook: string[]; exemplos: string[] }> {
  const [itens, corrigidas] = await Promise.all([
    prisma.knowledgeItem.findMany({
      where: { accountId, active: true, kind: { in: ['playbook', 'example'] } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      select: { kind: true, situation: true, answer: true },
    }),
    prisma.aiSuggestion.findMany({
      where: { accountId, outcome: 'edited', sentText: { not: null } },
      orderBy: { resolvedAt: 'desc' },
      take: 15,
      select: { context: true, sentText: true },
    }),
  ]);
  const playbook = itens.filter((i) => i.kind === 'playbook').map((i) => `- ${i.situation ? `${i.situation}: ` : ''}${i.answer}`);
  const exemplos = [
    ...itens.filter((i) => i.kind === 'example').map((i) => ({ s: i.situation, r: i.answer })),
    ...corrigidas.map((c) => ({ s: c.context, r: c.sentText! })),
  ].map((e) => `Situação: ${(e.s ?? '').slice(0, 220)}\nEle escreveu: ${e.r.slice(0, 450)}`);
  return { playbook, exemplos };
}

/** Imóveis citados no pedido logo depois de "ignore", "esqueça", "não fale"... */
function imoveisRecusados(imoveis: ImovelCatalogo[], pedido: string | undefined): ImovelCatalogo[] {
  if (!pedido) return [];
  const p = norm(pedido);
  return imoveis.filter((i) => {
    const nome = norm(i.titulo);
    const at = nome ? p.indexOf(nome) : -1;
    if (at < 0) return false;
    const antes = p.slice(Math.max(0, at - 40), at);
    return /(ignor|esquec|deix\w* de lado|nao (fal|ofere|cit|mencion|use)|sem falar|fora o|menos o)/.test(antes);
  });
}

/** Percentuais, valores e prazos da sugestão cujo número não aparece no contexto dado à IA. */
function numerosInventados(texto: string, contexto: string): string[] {
  const ctx = norm(contexto);
  // o mesmo número com a mesma unidade tem que estar no contexto ("20%" não vale por um "20/07")
  const UNIDADES: [RegExp, string][] = [
    [/%|por cento/, '(%|por cento)'],
    [/mes/, '(mes|meses)'],
    [/ano/, 'anos?'],
    [/m²|m2/, '(m²|m2|metros)'],
    [/vezes|x/, '(x|vezes|parcelas)'],
    [/mil/, 'mil'],
  ];
  const soltos = (norm(texto).match(/r\$\s?\d[\d.,]*(?:\s?mil)?|\d+(?:[.,]\d+)?\s?(?:%|por cento|mil\b|meses\b|mes\b|anos?\b|m²|m2\b|vezes\b|x\b)/g) ?? []).filter((a) => {
    const num = (a.match(/\d+(?:[.,]\d+)?/) ?? [''])[0];
    if (!num) return false;
    const n = num.replace(/[.,]/g, '[.,]?');
    if (a.startsWith('r$')) return !new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(ctx);
    const unidade = UNIDADES.find(([re]) => re.test(a.slice(num.length)))?.[1] ?? '';
    return !new RegExp(`(^|[^\\d])${n}\\s?${unidade}`).test(ctx);
  });
  // marcador esquecido ("bairro X", "[nome]")
  const marcadores = texto.match(/\[[^\]]{1,30}\]|\b(?:bairro|empreendimento|imovel|imóvel|valor|unidade) X\b/gi) ?? [];
  return Array.from(new Set([...soltos, ...marcadores].map((a) => a.trim())));
}

/**
 * Imóvel do catálogo que o corretor está oferecendo: procura o nome no pedido e,
 * se não achar, nas últimas mensagens dele (da mais recente para trás).
 */
function detectarProduto(imoveis: ImovelCatalogo[], pedido: string | undefined, mensagens: MsgWa[]): ImovelCatalogo | undefined {
  const marcas = imoveis.map((i) => ({ i, chaves: Array.from(palavras(i.titulo)) })).filter((x) => x.chaves.length);
  const achar = (texto: string) => {
    const t = palavras(texto);
    let melhor: { i: ImovelCatalogo; nota: number } | undefined;
    for (const { i, chaves } of marcas) {
      const acertos = chaves.filter((c) => t.has(c)).length;
      // nome inteiro, ou a marca (1ª palavra) e mais uma; só o bairro ("vila mariana") não conta
      const nota = acertos === chaves.length ? acertos + 10 : acertos >= 2 && t.has(chaves[0]) ? acertos : 0;
      if (nota && (!melhor || nota > melhor.nota)) melhor = { i, nota };
    }
    return melhor?.i;
  };
  if (pedido) {
    const p = achar(pedido);
    if (p) return p;
  }
  for (const m of [...mensagens].reverse().filter((x) => x.lado === '>').slice(0, 25)) {
    const p = achar(m.texto);
    if (p) return p;
  }
  return undefined;
}

// ── escolher o que entra no pedido (o limite é pequeno) ──
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PALAVRAS_VAZIAS = new Set('para com que uma uns umas por mais como mas isso esse essa este esta aqui voce cliente sobre quando onde qual quais seu sua seus suas pelo pela pode tem ter vai vou estou esta muito bem tudo ainda agora entao'.split(' '));
const palavras = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((p) => p.length >= 4 && !PALAVRAS_VAZIAS.has(p)));

/** Quantas palavras do texto aparecem na consulta (o que o cliente falou por último). */
function afinidade(texto: string, consulta: string): number {
  const c = palavras(consulta);
  let n = 0;
  palavras(texto).forEach((p) => {
    if (c.has(p)) n++;
  });
  return n;
}

/** Os mais relevantes primeiro (empate: a ordem original, mais recente), até o limite de caracteres. */
function escolherAte(itens: { texto: string; peso: number }[], max: number, sep = '\n'): string {
  const ordenados = itens.map((x, i) => ({ ...x, i })).sort((a, b) => b.peso - a.peso || a.i - b.i);
  const fora: string[] = [];
  let total = 0;
  for (const x of ordenados) {
    if (total + x.texto.length + sep.length > max) continue;
    fora.push(x.texto);
    total += x.texto.length + sep.length;
  }
  return fora.join(sep);
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
  /** produto que o corretor está oferecendo agora (escolhido na faixa) */
  oferta?: { propertyId?: string | null; texto?: string | null };
}): Promise<{ analise: string; sugestoes: Sugestao[]; produto: { titulo: string; origem: 'escolhido' | 'detectado' } | null }> {
  const [perfil, ficha, base, imoveis] = await Promise.all([
    perfilDaConta(params.accountId),
    fichaCliente(params.clientId),
    itensDaBase(params.accountId),
    catalogoLinhas(),
  ]);
  // o que o cliente disse por último (+ o pedido): guia a escolha do que entra
  const consulta = [params.pedido ?? '', ...params.mensagens.slice(-8).map((m) => m.texto)].join(' ');
  const interesse = ficha.imovel ? norm(ficha.imovel) : '';

  // Produto em oferta: o escolhido na faixa; senão, o imóvel do catálogo citado
  // no pedido ou nas últimas mensagens do corretor (o mais recente vale).
  // imóveis que o corretor mandou deixar de lado no pedido ("ignore o Smart Home")
  const recusados = imoveisRecusados(imoveis, params.pedido);
  const escolhido = params.oferta?.propertyId ? imoveis.find((i) => i.id === params.oferta!.propertyId) : undefined;
  const textoOferta = params.oferta?.texto?.trim() || '';
  const detectado = !escolhido && !textoOferta
    ? detectarProduto(imoveis.filter((i) => !recusados.includes(i)), params.pedido, params.mensagens)
    : undefined;
  const emOferta = escolhido ?? detectado;
  const produto = escolhido || textoOferta
    ? { titulo: escolhido?.titulo ?? textoOferta, origem: 'escolhido' as const }
    : detectado
      ? { titulo: detectado.titulo, origem: 'detectado' as const }
      : null;
  const blocoOferta =
    (escolhido || textoOferta || detectado
      ? `\n\nPRODUTO QUE O CORRETOR ESTÁ OFERECENDO AGORA (${escolhido || textoOferta ? 'escolhido por ele' : 'detectado nas mensagens dele'}):\n${[emOferta?.linha, textoOferta].filter(Boolean).join('\n')}`
      : '') +
    (recusados.length ? `\n\nNÃO MENCIONE (o corretor pediu para deixar de lado): ${recusados.map((i) => i.titulo).join(', ')}` : '');

  // Limite grátis do Groq: 8 mil tokens por minuto, entrada + resposta num pedido
  // só. Se mesmo assim passar (413), tenta de novo com menos de tudo.
  for (const escala of [1, 0.6]) {
    const L = {
      perfil: Math.round(3400 * escala),
      catalogo: Math.round(3000 * escala),
      playbook: Math.round(2000 * escala),
      exemplos: Math.round(2200 * escala),
      conversa: Math.round(5200 * escala),
    };
    const catalogo = escolherAte(
      imoveis.map((l) => ({
        texto: l.linha,
        peso: (recusados.includes(l) ? -1000 : 0) + (emOferta?.id === l.id ? 1000 : 0) + (interesse && norm(l.titulo).includes(interesse) ? 100 : 0) + afinidade(l.linha, consulta),
      })),
      L.catalogo,
    );
    const playbook = escolherAte(base.playbook.map((t) => ({ texto: t, peso: afinidade(t, consulta) })), L.playbook);
    const exemplos = escolherAte(base.exemplos.map((t) => ({ texto: t, peso: afinidade(t, consulta) })), L.exemplos, '\n---\n');

    const sistema = `${corta(perfil.texto, L.perfil)}

REGRAS DESTA TAREFA
0. Se houver PEDIDO DO CORRETOR, ele manda: siga o objetivo, o foco e o que ele mandou ignorar, mesmo que a ficha ou a conversa apontem outra coisa. O pedido é contexto interno: não conte ao cliente bastidores do corretor (arquivo apagado, anotação, "a RIA disse").
1. Leia a conversa INTEIRA e a situação no tempo antes de escrever. Considere o que já foi enviado, prometido ou combinado (fluxo, planta, visita, documentos) e as transcrições de áudio. Não repita o que já foi dito.
2. Se faz tempo que não se falam, reconheça isso com naturalidade e retome do ponto em que pararam; nada de "vi que recebeu" sobre algo antigo como se fosse recente.
3. NUNCA INVENTE: unidade disponível, condição, desconto, valor de parcela, entrada, prazo, aprovação ou "consegui liberar". Só cite o que está na CONVERSA, na FICHA ou no CATÁLOGO (imóveis com o nome exato; valores só como referência, "a partir de"). Se não há novidade real, não crie uma: retome o ponto pendente, pergunte o que mudou para ele ou ofereça refazer/ajustar o fluxo e uma ligação.
4. O imóvel de interesse da FICHA pode estar desatualizado. Se houver PRODUTO EM OFERTA, ou se na conversa o corretor passou a oferecer outro imóvel, as sugestões falam do mais recente.
5. Escreva como o corretor (veja o tom e os EXEMPLOS reais dele). Use o nome do cliente. Nunca deixe marcadores como [seu nome], [cliente] ou "bairro X" no texto; sem o dado real, não cite.
6. As 3 sugestões devem ser abordagens DIFERENTES (ex.: retomar o ponto pendente, entender o que mudou para o cliente, propor ligação/visita com dois horários). Cada uma pronta para enviar, curta. Se faltar um dado que só o corretor sabe (uma condição nova, por exemplo), diga isso no "porque" em vez de inventar no texto.
7. Responda só com JSON: {"analise":"2 a 3 frases: em que momento o cliente está, o que ficou pendente e qual o próximo passo","sugestoes":[{"texto":"mensagem pronta","porque":"motivo curto"}]}

CATÁLOGO (imóveis do CRM):
${catalogo || '(nenhum imóvel cadastrado)'}

PLAYBOOK DO CORRETOR (o que vale para esta situação):
${playbook || '(vazio)'}

EXEMPLOS REAIS DO CORRETOR (o que ele escreveu e funcionou):
${exemplos || '(nenhum ainda)'}`;

    const ultimaTs = params.mensagens.length ? params.mensagens[params.mensagens.length - 1].ts : 0;
    const diasParado = ultimaTs ? Math.floor((Date.now() / 1000 - ultimaTs) / 86400) : 0;
    const avisoTempo =
      diasParado >= 21
        ? `
ATENÇÃO: a conversa está parada há ${diasParado} dias. Não pergunte se ele "recebeu" ou "conseguiu ver" algo antigo. Reconheça o tempo em pelo menos duas sugestões ("faz um tempo que a gente não se fala", "sumi por aqui também") e reabra a conversa a partir do que ele buscava.`
        : '';
    const usuario = `${params.pedido ? `PEDIDO DO CORRETOR (prioridade máxima): ${params.pedido}\n\n` : ''}SITUAÇÃO NO TEMPO:
${situacaoNoTempo(params.mensagens)}${avisoTempo}

FICHA DO CLIENTE NO CRM:
${ficha.texto}${blocoOferta}

CONVERSA (mais recente por último; [áudio] já vem transcrito):
${cortaInicio(conversaEmTexto(params.mensagens, 60), L.conversa) || '(sem mensagens)'}
${params.pedido ? `\nLEMBRE DO PEDIDO DO CORRETOR: ${params.pedido}` : ''}`;

    let texto: string;
    try {
      texto = await groq({
        messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }],
        temperature: 0.4, // mais baixo: inventa menos
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });
    } catch (e) {
      if (e instanceof ErroExt && e.status === 413 && escala === 1) continue;
      throw e;
    }
    const j = lerJsonTolerante(texto);
    const sugestoes = (Array.isArray(j?.sugestoes) ? j.sugestoes : [])
      .filter((s: any) => typeof s?.texto === 'string' && s.texto.trim())
      .slice(0, 3)
      .map((s: any) => {
        const texto = s.texto.trim();
        let porque = String(s.porque ?? '').trim();
        // condição com número que não está em lugar nenhum = provável invenção
        const soltos = numerosInventados(texto, `${sistema} ${usuario}`);
        if (soltos.length) porque = `⚠ Confira antes de enviar: ${soltos.join(', ')} não aparece na conversa nem no CRM. ${porque}`.trim();
        return { texto, porque };
      });
    if (!sugestoes.length) throw new ErroExt(502, 'A IA respondeu num formato inesperado. Tente de novo.');
    return { analise: String(j.analise ?? '').trim(), sugestoes, produto };
  }
  throw new ErroExt(413, 'A conversa ficou grande demais para o limite da IA. Tente com um pedido mais curto.');
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
