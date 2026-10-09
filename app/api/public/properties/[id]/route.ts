import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveLeadLink } from '@/lib/public-lead-link';

export const dynamic = 'force-dynamic';

/**
 * Dados do imóvel para a página pública.
 *
 * Só responde se o link trouxer um corretor ou uma roleta válidos: sem isso
 * não há para quem entregar o lead, e a página mostra erro.
 * Os preços das tipologias NÃO saem daqui: são liberados pela rota de cadastro
 * (/api/public/leads) depois que o visitante deixa o contato.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    if (!propertyId) {
      return NextResponse.json({ error: 'ID do imóvel não fornecido' }, { status: 400 });
    }

    const query = new URL(request.url).searchParams;
    const link = await resolveLeadLink(query.get('brokerId'), query.get('roletaId'));
    if (!link.ok) {
      return NextResponse.json({ error: 'Link inválido.', code: 'invalid_link' }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        propertyTypes: {
          select: { id: true, name: true, area: true, dormitorios: true, suites: true, vagas: true, floorPlanUrl: true },
        },
        images: {
          select: { id: true, url: true },
          // Capa primeiro: é a foto grande do topo da página.
          orderBy: [{ isCover: 'desc' }, { id: 'asc' }],
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado ou indisponível' }, { status: 404 });
    }

    return NextResponse.json({
      id: property.id,
      title: property.title,
      features: property.features,
      address: property.address,
      type: property.type,
      status: property.status,
      images: property.images,
      propertyTypes: property.propertyTypes,
      // Link direto: o primeiro nome de quem vai atender. Na roleta ainda não se sabe quem é.
      attendantName: link.mode === 'direct' ? link.broker.name.split(' ')[0] : null,
    });
  } catch (error) {
    console.error('Erro ao buscar dados públicos do imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
