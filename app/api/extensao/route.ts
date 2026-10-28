import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ErroExt } from '@/lib/ext/auth';
import { analisarConversa, consolidar, registrarConversa, registroConversas, salvarPropostas } from '@/lib/ext/aprender';

export const maxDuration = 60;

/**
 * Página "Extensão WhatsApp" do CRM (só MARKETING_ADMIN): maturidade da RIA
 * (o que foi feito das sugestões) e a base de conhecimento.
 *   GET    → { stats, itens, registro }
 *   POST   → aprender com conversas importadas (ver abaixo)
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
  const [grupos, itens, conversas, registro] = await Promise.all([
    prisma.aiSuggestion.groupBy({ by: ['outcome'], where: { accountId: a.accountId, createdAt: { gte: desde } }, _count: true }),
    prisma.knowledgeItem.findMany({ where: { accountId: a.accountId }, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.waLink.count({ where: { accountId: a.accountId, notClient: false, clientId: { not: null } } }),
    registroConversas(a.accountId),
  ]);
  const stats = Object.fromEntries(grupos.map((g) => [g.outcome, g._count]));
  return NextResponse.json({ stats: { ...stats, conversas }, itens, registro });
}

/**
 * Aprender com conversas importadas (arquivo JSON exportado pela faixa):
 *   { acao: "analisar", conversa }            → { historico, regras, exemplos }
 *   { acao: "consolidar", regras, exemplos }  → { regras, exemplos }
 *   { acao: "salvar", regras, exemplos }      → { salvos }
 */
export async function POST(request: NextRequest) {
  const a = await admin();
  if ('erro' in a) return a.erro;
  const body = await request.json().catch(() => ({}));
  try {
    if (body.acao === 'analisar') {
      if (!body.conversa || !Array.isArray(body.conversa.mensagens)) return NextResponse.json({ error: 'Conversa inválida.' }, { status: 400 });
      const r = await analisarConversa(body.conversa);
      // conversa longa chega em partes: só a última registra, com o total das propostas
      if (body.registrar !== false && !r.pulada) {
        const propostas = (Number(body.propostas_antes) || 0) + r.regras.length + r.exemplos.length;
        await registrarConversa(a.accountId, a.user.id, body.conversa, propostas, 'importacao');
      }
      return NextResponse.json(r);
    }
    if (body.acao === 'consolidar') return NextResponse.json(await consolidar(a.accountId, body));
    if (body.acao === 'salvar') return NextResponse.json(await salvarPropostas(a.accountId, a.user.id, body, 'importacao'));
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e) {
    if (e instanceof ErroExt) return NextResponse.json({ error: e.message, esperarSeg: e.esperarSeg }, { status: e.status });
    console.error('[EXTENSAO_APRENDER]', e);
    return NextResponse.json({ error: 'Erro interno. Tente de novo.' }, { status: 500 });
  }
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
