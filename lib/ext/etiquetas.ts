// lib/ext/etiquetas.ts
// Etiquetas espelhadas: a etiqueta do cliente é a do CRM (model Tag), e cada uma
// pode estar ligada a uma etiqueta do WhatsApp Business (Tag.waLabelId).
//  - sincronizar: as do WhatsApp entram no CRM (liga por id ou nome); as do CRM
//    que o WhatsApp ainda não tem voltam para a faixa criar lá.
//  - mesclar (ao abrir a conversa): mescla em 3 vias o que mudou no WhatsApp e o
//    que mudou no CRM desde a última vez, e devolve o que a faixa deve marcar ou
//    desmarcar no WhatsApp para os dois ficarem iguais.
import { prisma } from '@/lib/prisma';

const COR_PADRAO = '#D9B779';
const corValida = (c: unknown) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);

export interface EtiquetaExt { id: string; nome: string; cor: string; wa_label_id: string | null }

export async function listarEtiquetas(): Promise<EtiquetaExt[]> {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  return tags.map((t) => ({ id: t.id, nome: t.name, cor: t.color, wa_label_id: t.waLabelId }));
}

/** Espelha as etiquetas do WhatsApp Business no CRM. */
export async function sincronizarEtiquetas(doWa: { wa_label_id: string; nome: string; cor?: string }[]) {
  const lista = doWa
    .filter((e) => e?.wa_label_id && String(e.nome ?? '').trim())
    .map((e) => ({ wa: String(e.wa_label_id), nome: String(e.nome).trim().slice(0, 40), cor: corValida(e.cor) }));
  const tags = await prisma.tag.findMany();
  const porWa = new Map(tags.filter((t) => t.waLabelId).map((t) => [t.waLabelId!, t]));
  const porNome = new Map(tags.map((t) => [t.name.toLowerCase(), t]));

  for (const e of lista) {
    const ligada = porWa.get(e.wa);
    if (ligada) {
      // renomeada no WhatsApp: o nome do WhatsApp vale (se não colidir com outra do CRM)
      const outra = porNome.get(e.nome.toLowerCase());
      if (ligada.name !== e.nome && (!outra || outra.id === ligada.id)) {
        await prisma.tag.update({ where: { id: ligada.id }, data: { name: e.nome } });
      }
      continue;
    }
    const mesmoNome = porNome.get(e.nome.toLowerCase());
    if (mesmoNome && !mesmoNome.waLabelId) {
      await prisma.tag.update({ where: { id: mesmoNome.id }, data: { waLabelId: e.wa } });
    } else if (!mesmoNome) {
      const nova = await prisma.tag.create({ data: { name: e.nome, color: e.cor ?? COR_PADRAO, waLabelId: e.wa } });
      porNome.set(nova.name.toLowerCase(), nova);
    }
  }

  // apagada no WhatsApp: desfaz a ligação (a etiqueta continua no CRM, com os clientes).
  // Nunca com a lista vazia: pode ser só o WhatsApp que ainda não carregou.
  if (lista.length) {
    const presentes = new Set(lista.map((e) => e.wa));
    const sumiram = tags.filter((t) => t.waLabelId && !presentes.has(t.waLabelId)).map((t) => t.id);
    if (sumiram.length) await prisma.tag.updateMany({ where: { id: { in: sumiram } }, data: { waLabelId: null } });
  }

  const etiquetas = await listarEtiquetas();
  // as do CRM sem par no WhatsApp: a faixa cria lá e liga (o WhatsApp Business aceita poucas)
  const criarNoWa = etiquetas.filter((e) => !e.wa_label_id).map((e) => ({ id: e.id, nome: e.nome }));
  return { etiquetas, criarNoWa };
}

export async function ligarEtiqueta(tagId: string, waLabelId: string) {
  await prisma.tag.updateMany({ where: { waLabelId }, data: { waLabelId: null } });
  await prisma.tag.update({ where: { id: tagId }, data: { waLabelId } });
}

export async function criarEtiqueta(nome: string, cor?: string, waLabelId?: string) {
  const limpo = nome.trim().slice(0, 40);
  const existente = await prisma.tag.findFirst({ where: { name: { equals: limpo, mode: 'insensitive' } } });
  if (existente) {
    if (waLabelId && !existente.waLabelId) await ligarEtiqueta(existente.id, waLabelId);
    return existente.id;
  }
  const t = await prisma.tag.create({ data: { name: limpo, color: corValida(cor) ?? COR_PADRAO, waLabelId: waLabelId || null } });
  return t.id;
}

type LinkEtiquetas = { id: string; clientId: string | null; waLabels: string[]; waLabelsSynced: boolean };

/**
 * Ao abrir a conversa vinculada. waAtuais = etiquetas que a conversa tem agora
 * no WhatsApp Business (undefined = WhatsApp comum: só o CRM vale).
 */
export async function mesclarEtiquetas(link: LinkEtiquetas, waAtuais?: string[]) {
  if (!link.clientId) return { etiquetas: [] as string[], acoesWa: null };
  const [tags, cliente] = await Promise.all([
    prisma.tag.findMany({ select: { id: true, waLabelId: true } }),
    prisma.client.findUnique({ where: { id: link.clientId }, select: { tags: { select: { id: true } } } }),
  ]);
  const crm = new Set((cliente?.tags ?? []).map((t) => t.id));
  if (!waAtuais) return { etiquetas: Array.from(crm), acoesWa: null };

  const tagDoWa = new Map(tags.filter((t) => t.waLabelId).map((t) => [t.waLabelId!, t.id]));
  const waDaTag = new Map(tags.filter((t) => t.waLabelId).map((t) => [t.id, t.waLabelId!]));
  const atual = new Set(waAtuais.filter((w) => tagDoWa.has(w)));
  const antes = new Set(link.waLabelsSynced ? link.waLabels : []);

  const final = new Set(crm);
  // marcada no WhatsApp desde a última vez (na primeira vez, tudo o que o WhatsApp tem soma)
  atual.forEach((w) => { if (!antes.has(w)) final.add(tagDoWa.get(w)!); });
  // desmarcada no WhatsApp desde a última vez
  antes.forEach((w) => { if (!atual.has(w) && tagDoWa.has(w)) final.delete(tagDoWa.get(w)!); });

  const waFinal = Array.from(final).map((id) => waDaTag.get(id)).filter((w): w is string => Boolean(w));
  const acoesWa = {
    adicionar: waFinal.filter((w) => !atual.has(w)),
    remover: Array.from(atual).filter((w) => !waFinal.includes(w)),
  };
  const mudouCrm = final.size !== crm.size || Array.from(final).some((id) => !crm.has(id));
  await prisma.$transaction([
    ...(mudouCrm
      ? [prisma.client.update({ where: { id: link.clientId }, data: { tags: { set: Array.from(final).map((id) => ({ id })) } } })]
      : []),
    prisma.waLink.update({ where: { id: link.id }, data: { waLabels: waFinal, waLabelsSynced: true } }),
  ]);
  return { etiquetas: Array.from(final), acoesWa };
}

/** Etiquetas marcadas na faixa (já aplicadas no WhatsApp pela faixa, quando Business). */
export async function definirEtiquetas(link: LinkEtiquetas, ids: string[]) {
  if (!link.clientId) return [];
  const tags = await prisma.tag.findMany({ where: { id: { in: ids } }, select: { id: true, waLabelId: true } });
  await prisma.$transaction([
    prisma.client.update({ where: { id: link.clientId }, data: { tags: { set: tags.map((t) => ({ id: t.id })) } } }),
    prisma.waLink.update({
      where: { id: link.id },
      data: { waLabels: tags.map((t) => t.waLabelId).filter((w): w is string => Boolean(w)), waLabelsSynced: true },
    }),
  ]);
  return tags.map((t) => t.id);
}
