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
        imagens: {
          select: { id: true, url: true } 
        },
      },
    });

    if (!property || property.status === 'Vendido') {
      return NextResponse.json({ error: 'Imóvel não encontrado ou indisponível' }, { status: 404 });
    }

    // ✅ CORREÇÃO: Trocamos 'descricao' por 'features' para alinhar com o novo modelo.
    const publicPropertyData = {
      id: property.id,
      titulo: property.titulo,
      features: property.features, // ✅ Enviando 'features'
      endereco: property.endereco,
      tipo: property.tipo,
      status: property.status,
      imagens: property.imagens,
      tipologias: property.tipologias,
      createdAt: property.createdAt.toISOString(),
    };

    return NextResponse.json(publicPropertyData);
  } catch (error) {
    console.error('Erro ao buscar dados públicos do imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
