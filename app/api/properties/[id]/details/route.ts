// app/api/properties/[id]/details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// TODO: Replace getUserFromToken with Supabase auth helpers
import { getUserFromToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        images: {
          select: { id: true, url: true },
        },
        propertyTypes: {
          include: { floorPlans: true }, // Includes floor plan images
        },
        creator: { select: { name: true } },
        updater: { select: { name: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // Maps data to the format expected by the frontend
    const formattedProperty = {
      ...property, // Includes all scalar fields from the property
      title: property.title,
      address: property.address,
      type: property.type,
      images: property.images,
      // Renaming 'propertyTypes' to 'typologies' for frontend compatibility
      typologies: property.propertyTypes.map((t) => ({
        id: t.id,
        name: t.name,
        value: t.value,
        areaSqMeters: t.areaSqMeters,
        bedrooms: t.bedrooms,
        suites: t.suites,
        parkingSpaces: t.parkingSpaces,
        floorPlans: t.floorPlans, // Ensures floor plans are included
      })),
      creatorName: property.creator?.name || 'N/A',
      updaterName: property.updater?.name || 'N/A',
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
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
