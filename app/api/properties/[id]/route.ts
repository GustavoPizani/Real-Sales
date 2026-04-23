import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        images: { select: { id: true, url: true } },
        propertyTypes: true,
        creator: { select: { name: true } },
        updater: { select: { name: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: property.id,
      title: property.title,
      features: property.features,
      address: property.address,
      type: property.type,
      status: property.status,
      images: property.images,
      typologies: property.propertyTypes.map((t) => ({
        id: t.id,
        name: t.name,
        value: t.value,
        area: t.area,
        dormitorios: t.dormitorios,
        suites: t.suites,
        vagas: t.vagas,
        floorPlanUrl: t.floorPlanUrl,
      })),
      creatorName: property.creator?.name || 'N/A',
      updaterName: property.updater?.name || 'N/A',
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const propertyId = params.id;
    const { title, features, address, type, status, typologies, imageUrls } = await request.json();

    const existingProperty = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!existingProperty) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    const updatedProperty = await prisma.$transaction(async (tx) => {
      const property = await tx.property.update({
        where: { id: propertyId },
        data: {
          ...(title && { title }),
          ...(Array.isArray(features) && { features }),
          ...(address !== undefined && { address }),
          ...(type !== undefined && { type }),
          ...(status && { status }),
          updaterId: user.id,
        },
      });

      if (Array.isArray(typologies)) {
        await tx.propertyType.deleteMany({ where: { propertyId } });
        if (typologies.length > 0) {
          await tx.propertyType.createMany({
            data: typologies.map((t: any) => ({
              name: t.name || '',
              value: parseFloat(t.value ?? t.valor) || 0,
              area: parseFloat(t.area) || null,
              dormitorios: parseInt(t.dormitorios) || null,
              suites: parseInt(t.suites) || null,
              vagas: parseInt(t.vagas) || null,
              floorPlanUrl: t.floorPlanUrl || null,
              propertyId,
            })),
          });
        }
      }

      if (Array.isArray(imageUrls)) {
        await tx.propertyImage.deleteMany({ where: { propertyId } });
        if (imageUrls.length > 0) {
          await tx.propertyImage.createMany({
            data: imageUrls.map((url: string) => ({ url, propertyId })),
          });
        }
      }

      return property;
    });

    return NextResponse.json({ success: true, property: updatedProperty });
  } catch (error) {
    console.error('Erro ao ATUALIZAR imóvel:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao atualizar o imóvel.' }, { status: 500 });
  }
}
