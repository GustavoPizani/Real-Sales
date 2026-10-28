import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acessoAoCliente, camposVenda, dadosDaVenda, sincronizarTotalVendas } from '@/lib/client-sales';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string; saleId: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  const a = await acessoAoCliente(params.id);
  if ('erro' in a) return a.erro;
  try {
    const dados = await dadosDaVenda(await request.json().catch(() => ({})));
    const r = await prisma.clientSale.updateMany({ where: { id: params.saleId, clientId: params.id }, data: dados });
    if (!r.count) return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 });
    const venda = await prisma.clientSale.findUnique({ where: { id: params.saleId }, select: camposVenda });
    const total = await sincronizarTotalVendas(params.id);
    return NextResponse.json({ venda, total });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Não foi possível salvar a venda.' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const a = await acessoAoCliente(params.id);
  if ('erro' in a) return a.erro;
  await prisma.clientSale.deleteMany({ where: { id: params.saleId, clientId: params.id } });
  const total = await sincronizarTotalVendas(params.id);
  return NextResponse.json({ ok: true, total });
}
