import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

/**
 * Página "Extensão WhatsApp" do CRM (só MARKETING_ADMIN): maturidade da RIA
 * (o que foi feito das sugestões) e a base de conhecimento.
 *   GET    → { stats, itens }
 *   POST   → cria item { tipo, situacao?, resposta }
 *   PATCH  → { id, ativo }
 *   DELETE → ?id=
 */
async function admin() {
  const user = await getUserFromToken();
  if (!user) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  if (user.role !== Role.MARKETING_ADMIN) return { erro: NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 }) };
  return { user, accountId: user.accountId ?? user.id };
}

export async function GET() {
  const a = await admin();
  if ('erro' in a) return a.erro;
  const desde = new Date(Date.now() - 30 * 864e5);
  const [grupos, itens, conversas] = await Promise.all([
    prisma.aiSuggestion.groupBy({ by: ['outcome'], where: { accountId: a.accountId, createdAt: { gte: desde } }, _count: true }),
    prisma.knowledgeItem.findMany({ where: { accountId: a.accountId }, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.waLink.count({ where: { accountId: a.accountId, notClient: false, clientId: { not: null } } }),
  ]);
  const stats = Object.fromEntries(grupos.map((g) => [g.outcome, g._count]));
  return NextResponse.json({ stats: { ...stats, conversas }, itens });
}

export async function POST(request: NextRequest) {
  const a = await admin();
  if ('erro' in a) return a.erro;
  const body = await request.json().catch(() => ({}));
  const resposta = typeof body.resposta === 'string' ? body.resposta.trim().slice(0, 4000) : '';
  if (!resposta) return NextResponse.json({ error: 'Escreva a resposta ou a regra.' }, { status: 400 });
  const item = await prisma.knowledgeItem.create({
    data: {
      accountId: a.accountId,
      userId: a.user.id,
      kind: body.tipo === 'example' ? 'example' : 'playbook',
      situation: typeof body.situacao === 'string' && body.situacao.trim() ? body.situacao.trim().slice(0, 1500) : null,
      answer: resposta,
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const a = await admin();
  if ('erro' in a) return a.erro;
  const { id, ativo } = await request.json().catch(() => ({}));
  const r = await prisma.knowledgeItem.updateMany({ where: { id: String(id), accountId: a.accountId }, data: { active: Boolean(ativo) } });
  if (!r.count) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const a = await admin();
  if ('erro' in a) return a.erro;
  const id = request.nextUrl.searchParams.get('id') ?? '';
  await prisma.knowledgeItem.deleteMany({ where: { id, accountId: a.accountId } });
  return NextResponse.json({ ok: true });
}
