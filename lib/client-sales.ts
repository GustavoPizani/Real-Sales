// lib/client-sales.ts
// Vendas do cliente (model ClientSale). Um cliente pode ter várias; a soma vai
// para ClientWonDetails.saleValue, que é o que o dashboard lê como volume.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken, type UserPayload } from '@/lib/auth';
import { checkClientAccess } from '@/lib/client-access';

export const camposVenda = {
  id: true, clientId: true, propertyId: true, propertyTypeId: true, propertyName: true, unit: true, typology: true,
  area: true, bedrooms: true, floorPlanUrl: true, saleValue: true, saleDate: true, notes: true, createdAt: true,
  property: { select: { id: true, title: true } },
} as const;

/** Login + acesso ao cliente. Devolve o usuário ou a resposta de erro. */
export async function acessoAoCliente(clientId: string): Promise<{ user: UserPayload } | { erro: NextResponse }> {
  const user = await getUserFromToken();
  if (!user) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  const acesso = await checkClientAccess(user, clientId);
  if (acesso === 'not_found') return { erro: NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 }) };
  if (acesso === 'forbidden') return { erro: NextResponse.json({ error: 'Você não tem acesso a este cliente.' }, { status: 403 }) };
  return { user };
}

/** Recalcula o total vendido do cliente (ClientWonDetails) a partir das vendas. */
export async function sincronizarTotalVendas(clientId: string) {
  const soma = await prisma.clientSale.aggregate({ where: { clientId }, _sum: { saleValue: true }, _count: true });
  if (!soma._count) {
    await prisma.clientWonDetails.deleteMany({ where: { clientId } });
    return 0;
  }
  const total = soma._sum.saleValue ?? 0;
  await prisma.clientWonDetails.upsert({ where: { clientId }, update: { saleValue: total }, create: { clientId, saleValue: total } });
  return total;
}

const numero = (v: unknown) => {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const texto = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Dados da venda vindos do formulário. Imóvel do CRM: propertyId (+ tipologia,
 * que preenche planta, área e dormitórios). Fora do CRM: propertyName + planta.
 */
export async function dadosDaVenda(body: Record<string, unknown>) {
  const saleValue = numero(body.saleValue);
  if (saleValue == null || saleValue <= 0) throw new Error('Informe o valor da venda.');
  const propertyId = texto(body.propertyId, 60);
  const propertyTypeId = texto(body.propertyTypeId, 60);
  let typology = texto(body.typology, 120);
  let area = numero(body.area);
  let bedrooms = numero(body.bedrooms);
  let floorPlanUrl = texto(body.floorPlanUrl, 1000);

  if (propertyId) {
    const imovel = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!imovel) throw new Error('Imóvel não encontrado.');
  }
  if (propertyId && propertyTypeId) {
    const tipo = await prisma.propertyType.findFirst({
      where: { id: propertyTypeId, propertyId },
      select: { name: true, area: true, dormitorios: true, floorPlanUrl: true },
    });
    if (tipo) {
      typology ??= tipo.name;
      area ??= tipo.area;
      bedrooms ??= tipo.dormitorios;
      floorPlanUrl ??= tipo.floorPlanUrl;
    }
  }
  if (!propertyId && !texto(body.propertyName)) throw new Error('Escolha o imóvel do CRM ou escreva o nome do empreendimento.');

  const data = texto(body.saleDate, 30);
  const saleDate = data ? new Date(data.length === 10 ? `${data}T12:00:00` : data) : null;
  return {
    propertyId,
    propertyTypeId: propertyId ? propertyTypeId : null,
    propertyName: propertyId ? null : texto(body.propertyName),
    unit: texto(body.unit, 60),
    typology,
    area,
    bedrooms: bedrooms == null ? null : Math.round(bedrooms),
    floorPlanUrl,
    saleValue,
    saleDate: saleDate && !Number.isNaN(saleDate.getTime()) ? saleDate : null,
    notes: texto(body.notes, 2000),
  };
}
