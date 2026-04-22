// app/api/properties/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // ✅ Recebe 'features' e não mais 'description'
    const {
      title, features, type, address, status, typologies, imageUrls
    } = await request.json();

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Título e tipo são obrigatórios.' },
        { status: 400 }
      );
    }

    const newProperty = await prisma.$transaction(async (tx) => {
      const imovel = await tx.imovel.create({
        data: {
          title: title,
          // descricao: description, // ❌ Removido
          features: features || [], // ✅ Adicionado
          tipo: type,
          endereco: address,
          status: status || PropertyStatus.AVAILABLE,
          creatorId: user.id, // ✅ Salva quem criou
          updaterId: user.id, // ✅ Salva quem atualizou pela primeira vez
        },
      });

      if (typologies && typologies.length > 0) {
        await tx.tipologiaImovel.createMany({
          data: typologies.map((t: any) => ({
            name: t.name, // Corrigido de t.name para t.name
            valor: parseFloat(t.valor) || 0,
            area: parseFloat(t.area) || null,
            dormitorios: parseInt(t.dormitorios) || null,
            suites: parseInt(t.suites) || null,
            vagas: parseInt(t.vagas) || null,
            imovelId: imovel.id,
          })),
        });
      }

      if (imageUrls && imageUrls.length > 0) {
        await tx.imagemImovel.createMany({
          data: imageUrls.map((url: string) => ({
            url: url,
            imovelId: imovel.id,
          })),
        });
      }

      return imovel;
    });

    return NextResponse.json(newProperty, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar propriedade:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar propriedade.' },
      { status: 500 }
    );
  }
}
