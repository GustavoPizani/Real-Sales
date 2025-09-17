// app/api/properties/[id]/details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const property = await prisma.imovel.findUnique({
      where: { id: params.id },
      include: {
        // ✅ CORREÇÃO: Apenas relações são incluídas aqui.
        // Campos como 'endereco' já são retornados por padrão.
        imagens: {
          select: { id: true, url: true },
        },
        tipologias: {
          include: { plantas: true }, // Inclui as imagens das plantas
        },
        creator: { select: { nome: true } },
        updater: { select: { nome: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // Mapeia os dados para o formato esperado pelo frontend
    const formattedProperty = {
      ...property, // Inclui todos os campos escalares do imóvel
      title: property.titulo, // Renomeia para consistência
      address: property.endereco,
      type: property.tipo,
      images: property.imagens, // Renomeia 'imagens' para 'images'
      typologies: property.tipologias.map((t) => ({ // Renomeia 'tipologias' para 'typologies'
        id: t.id,
        nome: t.nome,
        valor: t.valor,
        area: t.area,
        dormitorios: t.dormitorios,
        suites: t.suites,
        vagas: t.vagas,
        plantas: t.plantas, // Garante que as plantas sejam incluídas
      })),
      creatorName: property.creator?.nome || 'N/A',
      updaterName: property.updater?.nome || 'N/A',
      created_at: property.createdAt.toISOString(),
      updated_at: property.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedProperty);
  } catch (error) {
    console.error('Erro ao buscar detalhes do imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
