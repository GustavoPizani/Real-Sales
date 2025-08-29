// app/api/public/properties/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;

    if (!propertyId) {
      return NextResponse.json({ error: 'ID do imóvel não fornecido' }, { status: 400 });
    }

    const property = await prisma.imovel.findUnique({
      where: { id: propertyId },
      include: {
        tipologias: true,
        imagens: { select: { url: true } },
      },
    });

    if (!property || property.status === 'Vendido') {
      return NextResponse.json({ error: 'Imóvel não encontrado ou indisponível' }, { status: 404 });
    }

    // Mapeamento completo dos dados do Prisma para o formato esperado pelo frontend
    const publicPropertyData = {
      id: property.id,
      title: property.titulo,
      description: property.descricao,
      address: "Localização privilegiada. Consulte-nos para detalhes.",
      type: property.tipo,
      status: property.status,
      images: property.imagens.map(i => i.url),
      typologies: property.tipologias.map(t => ({
        id: t.id,
        name: t.nome,
        // price: t.valor, // Preço removido
        area: t.area,
        bedrooms: t.dormitorios,
        bathrooms: t.suites,
        parking_spaces: t.vagas,
        description: t.descricao,
        available_units: t.unidadesDisponiveis,
      })),
      developer: null,
      created_at: property.createdAt.toISOString(),
      user_id: property.usuarioId,
      features: [],
    };

    return NextResponse.json(publicPropertyData);
  } catch (error) {
    console.error('Erro ao buscar dados públicos do imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
