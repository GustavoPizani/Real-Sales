import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoAoCliente, camposVenda, dadosDaVenda, sincronizarTotalVendas } from '@/lib/client-sales';

export const dynamic = 'force-dynamic';

/** GET: vendas do cliente. POST: nova venda (o total vai para ClientWonDetails). */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const a = await acessoAoCliente(params.id);
  if ('erro' in a) return a.erro;
  const vendas = await prisma.clientSale.findMany({
    where: { clientId: params.id },
    orderBy: [{ saleDate: 'asc' }, { createdAt: 'asc' }],
    select: camposVenda,
  });
  return NextResponse.json({ vendas, total: vendas.reduce((s, v) => s + v.saleValue, 0) });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const a = await acessoAoCliente(params.id);
  if ('erro' in a) return a.erro;
  try {
    const dados = await dadosDaVenda(await request.json().catch(() => ({})));
    const venda = await prisma.clientSale.create({
      data: { ...dados, clientId: params.id, createdById: a.user.id },
      select: camposVenda,
    });
    const total = await sincronizarTotalVendas(params.id);
    return NextResponse.json({ venda, total }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Não foi possível salvar a venda.' }, { status: 400 });
  }
}
