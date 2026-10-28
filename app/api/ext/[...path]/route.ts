// API da extensão do WhatsApp (faixa no WhatsApp Web). Uma rota com despacho
// pelo caminho: /api/ext/<rota>. Login por "Authorization: Bearer <token do
// Supabase>" (lib/ext/auth.ts) e só para o MARKETING_ADMIN. Erros: { erro }.
import { NextResponse } from 'next/server';
import { TaskType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ErroExt, ORIGEM_EXTENSAO, VERSAO_EXTENSAO, cabecalhosCors, usuarioDoPedido, type UsuarioExt,
} from '@/lib/ext/auth';
import {
  juntar, jsonMsgs, limparMensagens, resolverSugestoes, resumoTempos, sufixoTelefone, type MsgWa,
} from '@/lib/ext/conversa';
import { resumir, sugerir, transcrever } from '@/lib/ext/ria';
import { analisarConversa, consolidar, registrarConversa, registroConversas, salvarPropostas } from '@/lib/ext/aprender';
import {
  criarEtiqueta, definirEtiquetas, ligarEtiqueta, listarEtiquetas, mesclarEtiquetas, sincronizarEtiquetas,
} from '@/lib/ext/etiquetas';
import type { WaLink } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Corpo = Record<string, any>;
type Handler = (u: UsuarioExt, corpo: Corpo, req: Request) => Promise<unknown>;

const texto = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ── clientes ────────────────────────────────────────────────────────────────
const camposCliente = {
  id: true, fullName: true, phone: true, email: true, campaignSource: true, updatedAt: true, propertyOfInterestId: true,
  funnelStage: { select: { name: true } },
  propertyOfInterest: { select: { id: true, title: true } },
} as const;

function cartao(c: Awaited<ReturnType<typeof buscarCliente>>) {
  if (!c) return null;
  return {
    id: c.id,
    nome: c.fullName,
    telefone: c.phone,
    email: c.email,
    etapa: c.funnelStage.name,
    imovel: c.propertyOfInterest?.title ?? null,
    origem: c.campaignSource,
    atualizado_em: c.updatedAt,
  };
}

const buscarCliente = (id: string, accountId: string) =>
  prisma.client.findFirst({ where: { id, accountId }, select: camposCliente });

/** "ref. AB12CD" na mensagem pré-preenchida → imóvel cujo id começa com esse código. */
async function imovelDaRef(ref: unknown) {
  const codigo = texto(ref, 12).toLowerCase();
  if (!/^[0-9a-f]{4,12}$/.test(codigo)) return null;
  return prisma.property.findFirst({ where: { id: { startsWith: codigo } }, select: { id: true, title: true } });
}

async function candidatos(u: UsuarioExt, telefone: string, termo: string) {
  const sufixo = sufixoTelefone(telefone);
  const where = termo
    ? {
        accountId: u.accountId,
        OR: [
          { fullName: { contains: termo, mode: 'insensitive' as const } },
          ...(termo.includes('@') ? [{ email: { contains: termo, mode: 'insensitive' as const } }] : []),
          ...(termo.replace(/\D/g, '').length >= 8 ? [{ phone: { contains: sufixoTelefone(termo) } }] : []),
        ],
      }
    : sufixo.length === 8
      ? { accountId: u.accountId, phone: { contains: sufixo } }
      : null;
  if (!where) return [];
  const lista = await prisma.client.findMany({ where, select: camposCliente, orderBy: { updatedAt: 'desc' }, take: 8 });
  return lista.map(cartao);
}

async function linkDoUsuario(u: UsuarioExt, id: unknown) {
  const link = await prisma.waLink.findFirst({ where: { id: texto(id, 60), userId: u.id } });
  if (!link) throw new ErroExt(404, 'Conversa não encontrada. Abra a conversa de novo.');
  return link;
}

const mensagensDe = (link: { messages: unknown }) => (link.messages as unknown as MsgWa[]) ?? [];

/** Grava as mensagens novas na janela da conversa e resolve as sugestões pendentes. */
async function gravarMensagens(linkId: string, guardadas: MsgWa[], novasBrutas: unknown) {
  const novas = limparMensagens(novasBrutas);
  if (!novas.length) return guardadas;
  const msgs = juntar(guardadas, novas);
  await prisma.waLink.update({ where: { id: linkId }, data: { messages: jsonMsgs(msgs), ...resumoTempos(msgs) } });
  await resolverSugestoes(linkId, msgs);
  return msgs;
}

/** Prazo do próximo contato: a tarefa ligada ao vínculo, enquanto não for concluída. */
async function prazoDe(taskId: string | null) {
  if (!taskId) return null;
  const t = await prisma.task.findUnique({ where: { id: taskId }, select: { dateTime: true, isCompleted: true, description: true } });
  return t && !t.isCompleted ? { em: t.dateTime, nota: t.description } : null;
}

const etiquetasWa = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 50) : undefined);

/** etiquetasDoWa: as que a conversa tem no WhatsApp Business agora (mescla com o CRM). */
async function respostaVinculo(u: UsuarioExt, link: WaLink, mensagens: MsgWa[], etiquetasDoWa?: string[]) {
  const [cliente, prazo, etiquetas] = await Promise.all([
    link.clientId ? buscarCliente(link.clientId, u.accountId) : null,
    prazoDe(link.followUpTaskId),
    link.notClient ? { etiquetas: [] as string[], acoesWa: null } : mesclarEtiquetas(link, etiquetasDoWa),
  ]);
  return {
    vinculo: {
      id: link.id,
      nao_cliente: link.notClient,
      nome_contato: link.contactName,
      ultima_cliente_em: link.lastClientAt,
      ultima_corretor_em: link.lastBrokerAt,
      ultima_lado: link.lastSide,
      etiquetas: etiquetas.etiquetas,
      prazo,
    },
    cliente: cartao(cliente),
    acoesWa: etiquetas.acoesWa,
    mensagens,
  };
}

// ── rotas ───────────────────────────────────────────────────────────────────
const ROTAS: Record<string, Handler> = {
  async sessao(u) {
    const desde = new Date(Date.now() - 30 * 864e5);
    const [imoveis, resultados] = await Promise.all([
      prisma.property.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }),
      prisma.aiSuggestion.groupBy({ by: ['outcome'], where: { accountId: u.accountId, createdAt: { gte: desde } }, _count: true }),
    ]);
    return {
      usuario: { nome: u.name, email: u.email },
      versaoPublicada: VERSAO_EXTENSAO,
      etiquetas: await listarEtiquetas(),
      imoveis,
      sugestoes30d: Object.fromEntries(resultados.map((r) => [r.outcome, r._count])),
    };
  },

  async 'conversa/abrir'(u, c) {
    const waChatId = texto(c.wa_chat_id, 120);
    if (!waChatId) throw new ErroExt(400, 'Conversa inválida.');
    const link = c.buscar ? null : await prisma.waLink.findUnique({ where: { userId_waChatId: { userId: u.id, waChatId } } });
    if (link && (link.clientId || link.notClient)) {
      const msgs = link.notClient ? [] : await gravarMensagens(link.id, mensagensDe(link), c.mensagens);
      return respostaVinculo(u, (await prisma.waLink.findUnique({ where: { id: link.id } }))!, msgs, etiquetasWa(c.etiquetas_wa));
    }
    const [clientes, imovelRef] = await Promise.all([
      candidatos(u, texto(c.telefone, 30), texto(c.termo, 80)),
      imovelDaRef(c.ref),
    ]);
    return { vinculo: null, cliente: null, candidatos: clientes, imovelRef };
  },

  async vinculo(u, c) {
    const waChatId = texto(c.wa_chat_id, 120);
    if (!waChatId) throw new ErroExt(400, 'Conversa inválida.');
    const naoCliente = c.nao_cliente === true;
    let clientId: string | null = null;
    if (!naoCliente) {
      const cliente = await buscarCliente(texto(c.client_id, 60), u.accountId);
      if (!cliente) throw new ErroExt(404, 'Cliente não encontrado.');
      clientId = cliente.id;
      // veio pelo link com "ref.": se o cliente ainda não tem imóvel de interesse, usa o da ref
      const imovel = await imovelDaRef(c.ref);
      if (imovel && !cliente.propertyOfInterestId) {
        await prisma.client.update({ where: { id: cliente.id }, data: { propertyOfInterestId: imovel.id } });
      }
    }
    const dados = {
      phone: texto(c.telefone, 30) || null,
      contactName: texto(c.nome, 120) || null,
      clientId,
      notClient: naoCliente,
      // cliente novo na conversa: a próxima mescla de etiquetas começa do zero
      waLabels: [],
      waLabelsSynced: false,
      // "não é cliente": a conversa não fica guardada
      ...(naoCliente ? { messages: jsonMsgs([]), lastClientAt: null, lastBrokerAt: null, lastSide: null } : {}),
    };
    const link = await prisma.waLink.upsert({
      where: { userId_waChatId: { userId: u.id, waChatId } },
      create: { accountId: u.accountId, userId: u.id, waChatId, ...dados },
      update: dados,
    });
    const msgs = naoCliente ? [] : await gravarMensagens(link.id, mensagensDe(link), c.mensagens);
    return respostaVinculo(u, (await prisma.waLink.findUnique({ where: { id: link.id } }))!, msgs, etiquetasWa(c.etiquetas_wa));
  },

  /** Lead que chegou direto pelo WhatsApp (site, anúncio): cadastra no funil de entrada e vincula. */
  async 'cliente/novo'(u, c) {
    const nome = texto(c.nome, 120);
    const telefone = texto(c.telefone, 30).replace(/\D/g, '');
    if (!nome || telefone.length < 10) throw new ErroExt(400, 'Informe nome e telefone.');
    const funil =
      (await prisma.funnel.findFirst({ where: { isDefaultEntry: true }, select: { id: true } })) ??
      (await prisma.funnel.findFirst({ where: { isPreSales: false }, select: { id: true } }));
    const etapa = funil && (await prisma.funnelStage.findFirst({ where: { funnelId: funil.id }, orderBy: { order: 'asc' }, select: { id: true } }));
    if (!funil || !etapa) throw new ErroExt(400, 'Nenhum funil configurado no CRM.');
    const imovel = c.imovel_id ? await prisma.property.findUnique({ where: { id: texto(c.imovel_id, 60) }, select: { id: true } }) : null;
    const cliente = await prisma.client.create({
      data: {
        fullName: nome,
        phone: telefone,
        accountId: u.accountId,
        brokerId: u.id,
        createdById: u.id,
        funnelId: funil.id,
        funnelStageId: etapa.id,
        propertyOfInterestId: imovel?.id ?? null,
        campaignSource: texto(c.origem, 80) || 'WhatsApp',
      },
    });
    return ROTAS.vinculo(u, { ...c, client_id: cliente.id, nao_cliente: false }, null as never);
  },

  async conversa(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    if (link.notClient) return { mensagens: [] };
    return { mensagens: await gravarMensagens(link.id, mensagensDe(link), c.mensagens) };
  },

  async 'ia/sugestao'(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    const msgs = await gravarMensagens(link.id, mensagensDe(link), c.mensagens);
    const pedido = texto(c.pedido, 300);
    const r = await sugerir({ accountId: u.accountId, clientId: link.clientId, mensagens: msgs, pedido });
    // o que o cliente disse desde a sua última mensagem: vira a "situação" do exemplo
    const ultEu = msgs.findLastIndex((m) => m.lado === '>');
    const contexto = msgs.slice(ultEu + 1).filter((m) => m.lado === '<').map((m) => m.texto).join('\n').slice(0, 1500);
    // pediu outra antes de responder: a anterior (não escolhida) sai da conta
    await prisma.aiSuggestion.updateMany({
      where: { linkId: link.id, outcome: 'pending', chosenIndex: null },
      data: { outcome: 'superseded', resolvedAt: new Date() },
    });
    const s = await prisma.aiSuggestion.create({
      data: {
        accountId: u.accountId, userId: u.id, linkId: link.id,
        request: pedido || null,
        context: contexto || null,
        options: r.sugestoes as any,
      },
    });
    return { id: s.id, ...r };
  },

  async 'ia/sugestao/usar'(u, c) {
    const indice = Number(c.indice);
    if (!Number.isInteger(indice) || indice < 0 || indice > 2) throw new ErroExt(400, 'Sugestão inválida.');
    await prisma.aiSuggestion.updateMany({
      where: { id: texto(c.sugestao_id, 60), userId: u.id, outcome: 'pending' },
      data: { chosenIndex: indice },
    });
    return { ok: true };
  },

  async 'ia/resumo'(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    const msgs = await gravarMensagens(link.id, mensagensDe(link), c.mensagens);
    const cliente = link.clientId ? await buscarCliente(link.clientId, u.accountId) : null;
    return { texto: await resumir(msgs, cliente?.fullName ?? link.contactName ?? 'cliente') };
  },

  async nota(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    const conteudo = texto(c.texto, 8000);
    if (!link.clientId) throw new ErroExt(400, 'Vincule a conversa a um cliente primeiro.');
    if (!conteudo) throw new ErroExt(400, 'A anotação está vazia.');
    await prisma.note.create({
      data: { clientId: link.clientId, authorId: u.id, authorName: u.name, content: `💬 WhatsApp\n${conteudo}` },
    });
    return { ok: true };
  },

  async 'ia/transcrever'(u, _c, req) {
    const fd = await req.formData();
    const audio = fd.get('audio');
    if (!(audio instanceof Blob) || !audio.size) throw new ErroExt(400, 'Áudio não recebido.');
    if (audio.size > 4_000_000) throw new ErroExt(413, 'Áudio grande demais (máximo 4 MB).');
    const link = await linkDoUsuario(u, fd.get('vinculo_id'));
    const msgId = texto(fd.get('msg_id'), 120);
    const resultado = await transcrever(audio);
    // a transcrição fica no lugar do áudio, dentro da conversa guardada
    const msgs = mensagensDe(link);
    const m = msgs.find((x) => x.id === msgId);
    if (m) m.texto = resultado;
    else {
      const lado = fd.get('lado') === '>' ? '>' : '<';
      msgs.push({ id: msgId, ts: Number(fd.get('ts')) || Math.floor(Date.now() / 1000), lado, tipo: 'a', seg: Number(fd.get('segundos')) || undefined, texto: resultado });
    }
    await prisma.waLink.update({ where: { id: link.id }, data: { messages: jsonMsgs(juntar([], msgs)) } });
    return { texto: resultado };
  },

  // ── etiquetas (espelhadas com o WhatsApp Business) ──
  async etiquetas() {
    return { etiquetas: await listarEtiquetas() };
  },

  async 'etiquetas/sincronizar'(_u, c) {
    return sincronizarEtiquetas(Array.isArray(c.etiquetas) ? c.etiquetas : []);
  },

  async 'etiquetas/ligar'(_u, c) {
    await ligarEtiqueta(texto(c.tag_id, 60), texto(c.wa_label_id, 60));
    return { etiquetas: await listarEtiquetas() };
  },

  async 'etiquetas/criar'(_u, c) {
    const nome = texto(c.nome, 40);
    if (!nome) throw new ErroExt(400, 'Dê um nome à etiqueta.');
    const id = await criarEtiqueta(nome, texto(c.cor, 7), texto(c.wa_label_id, 60) || undefined);
    return { id, etiquetas: await listarEtiquetas() };
  },

  async 'vinculo/etiquetas'(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    const ids = Array.isArray(c.etiquetas) ? c.etiquetas.map(String).slice(0, 50) : [];
    return { etiquetas: await definirEtiquetas(link, ids) };
  },

  // ── prazo do próximo contato (uma tarefa do CRM) ──
  async 'vinculo/prazo'(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    if (!link.clientId) throw new ErroExt(400, 'Vincule a conversa a um cliente primeiro.');
    const atual = link.followUpTaskId
      ? await prisma.task.findUnique({ where: { id: link.followUpTaskId }, select: { id: true, isCompleted: true } })
      : null;
    const aberta = atual && !atual.isCompleted ? atual : null;
    if (!c.retornar_em) {
      if (aberta) await prisma.task.update({ where: { id: aberta.id }, data: { isCompleted: true } });
      return { prazo: null };
    }
    const quando = new Date(texto(c.retornar_em, 40));
    if (Number.isNaN(quando.getTime())) throw new ErroExt(400, 'Data inválida.');
    const nota = texto(c.nota, 300) || null;
    if (aberta) {
      await prisma.task.update({ where: { id: aberta.id }, data: { dateTime: quando, description: nota, reminderSentAt: null } });
    } else {
      const cliente = await buscarCliente(link.clientId, u.accountId);
      const t = await prisma.task.create({
        data: {
          title: `Retornar no WhatsApp: ${cliente?.fullName ?? link.contactName ?? 'cliente'}`,
          type: TaskType.WHATSAPP,
          dateTime: quando,
          description: nota,
          clientId: link.clientId,
          userId: u.id,
        },
      });
      await prisma.waLink.update({ where: { id: link.id }, data: { followUpTaskId: t.id } });
    }
    return { prazo: { em: quando, nota } };
  },

  // ── lista de clientes da faixa ──
  async lista(u, c) {
    const links = await prisma.waLink.findMany({
      where: { userId: u.id, notClient: false, clientId: { not: null } },
      select: {
        id: true, waChatId: true, phone: true, contactName: true, lastClientAt: true, lastBrokerAt: true, lastSide: true, followUpTaskId: true,
        client: {
          select: {
            fullName: true, phone: true,
            funnelStage: { select: { name: true } },
            propertyOfInterest: { select: { title: true } },
            tags: { select: { id: true } },
          },
        },
      },
    });
    const tarefas = await prisma.task.findMany({
      where: { id: { in: links.map((l) => l.followUpTaskId).filter((x): x is string => Boolean(x)) }, isCompleted: false },
      select: { id: true, dateTime: true, description: true },
    });
    const porTarefa = new Map(tarefas.map((t) => [t.id, t]));
    const agora = Date.now();
    const ms = (d: Date | null) => (d ? d.getTime() : 0);
    let itens = links.map((l) => {
      const t = l.followUpTaskId ? porTarefa.get(l.followUpTaskId) : undefined;
      const ultimo = Math.max(ms(l.lastClientAt), ms(l.lastBrokerAt));
      return {
        id: l.id,
        wa_chat_id: l.waChatId,
        nome: l.client?.fullName ?? l.contactName ?? '',
        telefone: l.client?.phone ?? l.phone,
        etapa: l.client?.funnelStage.name ?? null,
        imovel: l.client?.propertyOfInterest?.title ?? null,
        etiquetas: l.client?.tags.map((x) => x.id) ?? [],
        ultima_lado: l.lastSide,
        ultima_cliente_em: l.lastClientAt,
        ultima_corretor_em: l.lastBrokerAt,
        ultimo_contato_em: ultimo ? new Date(ultimo) : null,
        prazo_em: t?.dateTime ?? null,
        prazo_nota: t?.description ?? null,
      };
    });
    const etiqueta = texto(c.etiqueta_id, 60);
    if (etiqueta) itens = itens.filter((i) => i.etiquetas.includes(etiqueta));
    const situacao = texto(c.situacao, 20);
    if (situacao === 'esperando') itens = itens.filter((i) => i.ultima_lado === '<');
    else if (situacao === 'aguardando') itens = itens.filter((i) => i.ultima_lado === '>');
    else if (situacao === 'vencido') itens = itens.filter((i) => i.prazo_em && i.prazo_em.getTime() <= agora);
    else if (situacao === 'com_prazo') itens = itens.filter((i) => i.prazo_em);
    const dias = Number(c.sem_contato_dias) || 0;
    if (dias > 0) itens = itens.filter((i) => !i.ultimo_contato_em || agora - i.ultimo_contato_em.getTime() >= dias * 864e5);
    const ordem = texto(c.ordem, 20);
    itens.sort((a, b) => {
      if (ordem === 'prazo') {
        // com prazo primeiro, o mais próximo antes
        if (!a.prazo_em !== !b.prazo_em) return a.prazo_em ? -1 : 1;
        return ms(a.prazo_em) - ms(b.prazo_em);
      }
      if (ordem === 'recente') return ms(b.ultimo_contato_em) - ms(a.ultimo_contato_em);
      return ms(a.ultimo_contato_em) - ms(b.ultimo_contato_em); // mais tempo sem contato primeiro
    });
    return { itens: itens.slice(0, 300) };
  },

  /** Uma conversa inteira (formato do arquivo exportado) → histórico + regras e exemplos propostos. */
  async 'ia/aprender'(u, c) {
    if (!c.conversa || !Array.isArray(c.conversa.mensagens)) throw new ErroExt(400, 'Conversa inválida.');
    const r = await analisarConversa(c.conversa);
    // conversa longa chega em partes: só a última registra, com o total das propostas
    if (c.registrar !== false && !r.pulada) {
      const propostas = (Number(c.propostas_antes) || 0) + r.regras.length + r.exemplos.length;
      await registrarConversa(u.accountId, u.id, c.conversa, propostas, c.origem === 'zip' ? 'zip' : 'faixa');
    }
    return r;
  },

  /** Áudio de uma conversa exportada pelo WhatsApp (.zip): só transcreve, não guarda. */
  async 'ia/transcrever-arquivo'(_u, _c, req) {
    const fd = await req.formData();
    const audio = fd.get('audio');
    if (!(audio instanceof Blob) || !audio.size) throw new ErroExt(400, 'Áudio não recebido.');
    if (audio.size > 4_000_000) throw new ErroExt(413, 'Áudio grande demais (máximo 4 MB).');
    return { texto: await transcrever(audio) };
  },

  /** Anotação num cliente escolhido (ex.: histórico de uma conversa importada). */
  async 'nota/cliente'(u, c) {
    const cliente = await buscarCliente(texto(c.client_id, 60), u.accountId);
    if (!cliente) throw new ErroExt(404, 'Cliente não encontrado.');
    const conteudo = texto(c.texto, 8000);
    if (!conteudo) throw new ErroExt(400, 'A anotação está vazia.');
    await prisma.note.create({ data: { clientId: cliente.id, authorId: u.id, authorName: u.name, content: `💬 WhatsApp\n${conteudo}` } });
    return { ok: true, cliente: cliente.fullName };
  },

  /** Busca de clientes por nome, e-mail ou telefone (para salvar o histórico importado). */
  async 'clientes/buscar'(u, c) {
    return { clientes: await candidatos(u, '', texto(c.termo, 80)) };
  },

  /** Conversas já usadas no "Aprender"; atividade = [{ chat_id, t }] que a faixa vê agora. */
  async 'aprender/registro'(u, c) {
    return { registro: await registroConversas(u.accountId, c.atividade) };
  },

  async 'ia/aprender/consolidar'(u, c) {
    return consolidar(u.accountId, { regras: c.regras, exemplos: c.exemplos });
  },

  async 'conhecimento/lote'(u, c) {
    return salvarPropostas(u.accountId, u.id, { regras: c.regras, exemplos: c.exemplos }, 'conversas');
  },

  /** "Boa resposta": sua última mensagem e o que o cliente disse antes viram exemplo. */
  async 'conhecimento/ultima'(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    const msgs = await gravarMensagens(link.id, mensagensDe(link), c.mensagens);
    const i = msgs.findLastIndex((m) => m.lado === '>' && !m.tipo && m.texto.trim());
    if (i < 0) throw new ErroExt(400, 'Não achei uma mensagem de texto sua nesta conversa.');
    const antes = msgs.slice(0, i);
    const inicio = antes.findLastIndex((m) => m.lado === '>') + 1;
    const situacao = antes.slice(inicio).filter((m) => m.lado === '<').map((m) => m.texto).join('\n');
    const item = await prisma.knowledgeItem.create({
      data: { accountId: u.accountId, userId: u.id, kind: 'example', situation: situacao.slice(0, 1500) || null, answer: msgs[i].texto, source: 'faixa' },
    });
    return { id: item.id, situacao, resposta: msgs[i].texto };
  },

  /** Visita marcada na conversa: tarefa de visita + anotação no cliente. */
  async visita(u, c) {
    const link = await linkDoUsuario(u, c.vinculo_id);
    if (!link.clientId) throw new ErroExt(400, 'Vincule a conversa a um cliente primeiro.');
    const quando = new Date(texto(c.quando, 40));
    if (Number.isNaN(quando.getTime())) throw new ErroExt(400, 'Informe data e hora da visita.');
    const origem = ({ quintoandar: 'QuintoAndar', lancamento: 'Lançamento', outro: 'Outro' } as Record<string, string>)[c.origem] ?? 'Outro';
    const imovel = c.imovel_id ? await prisma.property.findUnique({ where: { id: texto(c.imovel_id, 60) }, select: { id: true, title: true } }) : null;
    const nomeImovel = imovel?.title || texto(c.imovel_texto, 160);
    const obs = texto(c.obs, 1000);
    const cliente = await buscarCliente(link.clientId, u.accountId);
    const titulo = `Visita ${origem}${nomeImovel ? `: ${nomeImovel}` : ''}`;
    const quandoBR = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
    await prisma.$transaction([
      prisma.task.create({
        data: {
          title: titulo,
          dateTime: quando,
          type: TaskType.VISIT,
          clientId: link.clientId,
          userId: u.id,
          description: [`Agendada pelo WhatsApp (${origem}).`, obs].filter(Boolean).join('\n'),
        },
      }),
      prisma.note.create({
        data: { clientId: link.clientId, authorId: u.id, authorName: u.name, content: `📅 ${titulo} — ${quandoBR}${obs ? `\n${obs}` : ''}` },
      }),
      ...(imovel && !cliente?.propertyOfInterestId
        ? [prisma.client.update({ where: { id: link.clientId }, data: { propertyOfInterestId: imovel.id } })]
        : []),
    ]);
    return { ok: true, titulo, quando: quandoBR };
  },
};

// ── despacho ────────────────────────────────────────────────────────────────
function responder(req: Request, corpo: unknown, status = 200) {
  return NextResponse.json(corpo, { status, headers: cabecalhosCors(req) });
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cabecalhosCors(req) });
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  if (params.path.join('/') === 'versao') {
    return responder(req, { versao: VERSAO_EXTENSAO, download: '/extensao/nordic-whatsapp.zip' });
  }
  return responder(req, { erro: 'Rota não encontrada.' }, 404);
}

export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  const rota = params.path.join('/');
  try {
    // Entrada automática: troca o login do site (token atual) por uma sessão só
    // da extensão, com um link de uso único. Só a extensão pode pedir.
    if (rota === 'conectar') {
      if (req.headers.get('origin') !== ORIGEM_EXTENSAO) throw new ErroExt(403, 'Origem não permitida.');
      const u = await usuarioDoPedido(req);
      const { data, error } = await createAdminClient().auth.admin.generateLink({ type: 'magiclink', email: u.email });
      if (error || !data.properties?.hashed_token) throw new ErroExt(500, 'Não foi possível entrar automaticamente.');
      return responder(req, { token_hash: data.properties.hashed_token });
    }

    const handler = ROTAS[rota];
    if (!handler) return responder(req, { erro: 'Rota não encontrada.' }, 404);
    const u = await usuarioDoPedido(req);
    const ehForm = (req.headers.get('content-type') ?? '').startsWith('multipart/form-data');
    const corpo = ehForm ? {} : await req.json().catch(() => ({}));
    return responder(req, await handler(u, corpo, req));
  } catch (e) {
    if (e instanceof ErroExt) return responder(req, { erro: e.message, ...(e.esperarSeg ? { esperarSeg: e.esperarSeg } : {}) }, e.status);
    console.error(`[EXT] ${rota}`, e);
    return responder(req, { erro: 'Erro interno. Tente de novo.' }, 500);
  }
}
