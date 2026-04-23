// app/api/properties/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { PropertyStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET: Busca todas as propriedades
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const properties = await prisma.property.findMany({
      include: {
        images: {
          take: 1,
          orderBy: {
            id: 'asc',
          },
        },
        propertyTypes: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Erro ao buscar propriedades:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar propriedades.' },
      { status: 500 }
    );
  }
}

// POST: Cria uma nova propriedade, as suas propertyTypes e associa as images
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { title, features, type, address, status, typologies, imageUrls } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 });
    }

    const newProperty = await prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          title,
          type: type || null,
          features: features || [],
          address: address || null,
          status: status || PropertyStatus.LANCAMENTO,
          creatorId: user.id,
          updaterId: user.id,
        },
      });

      if (typologies && typologies.length > 0) {
        await tx.propertyType.createMany({
          data: typologies.map((t: any) => ({
            name: t.name || '',
            value: parseFloat(t.valor) || 0,
            area: parseFloat(t.area) || null,
            dormitorios: parseInt(t.dormitorios) || null,
            suites: parseInt(t.suites) || null,
            vagas: parseInt(t.vagas) || null,
            floorPlanUrl: t.floorPlanUrl || null,
            propertyId: property.id,
          })),
        });
      }

      if (imageUrls && imageUrls.length > 0) {
        await tx.propertyImage.createMany({
          data: imageUrls.map((url: string) => ({ url, propertyId: property.id })),
        });
      }

      return property;
    });

    return NextResponse.json(newProperty, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar propriedade:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao criar propriedade.' }, { status: 500 });
  }
}
