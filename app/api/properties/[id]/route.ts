// c:\Users\gusta\Real-sales\app\api\properties\[id]\route.ts
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
        // CORREÇÃO: Seleciona o id e a url para consistência
        imagens: {
          select: { id: true, url: true },
        },
        tipologias: {
          include: { plantas: true } // Inclui as imagens das plantas
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // Mapeia os dados para o formato esperado pelo frontend
    const formattedProperty = {
      id: property.id,
      title: property.titulo,
      // description: property.descricao, // ❌ Removido
      features: property.features,     // ✅ Adicionado
      address: property.endereco,
      type: property.tipo,
      status: property.status,
      images: property.imagens,
      typologies: property.tipologias.map((t) => ({
        id: t.id,
        nome: t.nome,
        valor: t.valor,
        area: t.area,
        dormitorios: t.dormitorios,
        suites: t.suites,
        vagas: t.vagas,
        plantas: t.plantas, // ✅ Garante que as plantas sejam incluídas
      })),
      created_at: property.createdAt.toISOString(),
    };

    return NextResponse.json(formattedProperty);
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const propertyId = params.id;
    const body = await request.json();

    // ✅ Recebe 'features' e não mais 'description'
    const {
      title,
      features,
      address,
      type,
      status,
      typologies,
      imageUrls,
    } = body;

    // 1. Verificar se o imóvel existe e pertence ao usuário
    const existingProperty = await prisma.imovel.findUnique({
      where: { id: propertyId },
    });

    if (!existingProperty) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // 2. Usar uma transação para atualizar o imóvel e suas relações
    const updatedProperty = await prisma.$transaction(async (tx) => {
      // Atualiza os dados do imóvel
      const property = await tx.imovel.update({
        where: { id: propertyId },
        data: {
          ...(title && { titulo: title }),
          // ...(description && { descricao: description }), // ❌ Removido
          ...(Array.isArray(features) && { features: features }), // ✅ Adicionado
          ...(address && { endereco: address }),
          ...(type && { tipo: type }),
          ...(status && { status: status }),
        },
      });

      // Sincroniza as tipologias
      if (Array.isArray(typologies)) {
        await tx.tipologiaImovel.deleteMany({ where: { imovelId: propertyId } });
        if (typologies.length > 0) {
          await tx.tipologiaImovel.createMany({
            data: typologies.map((t: any) => ({
              nome: t.nome,
              valor: Number(t.valor) || 0,
              area: Number(t.area) || null,
              dormitorios: Number(t.dormitorios) || null,
              suites: Number(t.suites) || null,
              vagas: Number(t.vagas) || null,
              imovelId: propertyId,
            })),
          });
        }
      }

      // Sincroniza as imagens
      if (Array.isArray(imageUrls)) {
        await tx.imagemImovel.deleteMany({ where: { imovelId: propertyId } });
        if (imageUrls.length > 0) {
          await tx.imagemImovel.createMany({
            data: imageUrls.map((url: string) => ({
              url: url,
              imovelId: propertyId,
            })),
          });
        }
      }

      return property;
    });

    return NextResponse.json({ success: true, property: updatedProperty });
  } catch (error) {
    console.error('Erro ao ATUALIZAR imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar o imóvel.' },
      { status: 500 }
    );
  }
}
