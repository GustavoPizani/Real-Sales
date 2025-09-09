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
        tipologias: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // CORREÇÃO: Mapeia os dados para um formato unificado que atenda tanto a página de visualização quanto a de edição.
    const formattedProperty = {
      id: property.id,
      title: property.titulo,
      description: property.descricao,
      address: property.endereco,
      type: property.tipo,
      status: property.status,
      images: property.imagens, // A página de edição espera um array de objetos { id, url }
      typologies: property.tipologias.map((t) => ({
        id: t.id,
        nome: t.nome,
        valor: t.valor, // Mantém o nome original do schema
        area: t.area,
        dormitorios: t.dormitorios,
        suites: t.suites,
        vagas: t.vagas,
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

    // Log para depuração
    console.log('Corpo recebido para ATUALIZAÇÃO em PUT /api/properties/[id]:', JSON.stringify(body, null, 2));

    const {
      title,
      description,
      address,
      type,
      status,
      typologies, // array de objetos
      imageUrls,   // array de strings
    } = body;

    // 1. Verificar se o imóvel existe e pertence ao usuário
    const existingProperty = await prisma.imovel.findUnique({
      where: { id: propertyId },
    });

    if (!existingProperty) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    // ATENÇÃO: A verificação de propriedade do imóvel foi removida.
    // O schema do 'Imovel' não possui um campo 'usuarioId' para verificar quem é o dono.
    // É altamente recomendável adicionar essa relação no schema.prisma para segurança.
    // Ex: if (existingProperty.usuarioId !== user.id) { return NextResponse.json({ error: 'Acesso negado' }, { status: 403 }); }

    // 2. Usar uma transação para atualizar o imóvel e suas relações
    const updatedProperty = await prisma.$transaction(async (tx) => {
      // Atualiza os dados escalares do imóvel
      const property = await tx.imovel.update({
        where: { id: propertyId },
        data: {
          ...(title && { titulo: title }),
          ...(description && { descricao: description }),
          ...(address && { endereco: address }),
          ...(type && { tipo: type }),
          ...(status && { status: status }),
        },
      });

      // Sincroniza as tipologias: apaga as antigas e cria as novas
      if (Array.isArray(typologies)) {
        await tx.tipologiaImovel.deleteMany({ where: { imovelId: propertyId } });
        await tx.tipologiaImovel.createMany({
          data: typologies.map((t: any) => ({
            nome: t.nome,
            valor: Number(t.valor),
            area: Number(t.area),
            dormitorios: Number(t.dormitorios),
            suites: Number(t.suites),
            vagas: Number(t.vagas),
            imovelId: propertyId,
          })),
        });
      }

      // Sincroniza as imagens: apaga as antigas e cria as novas
      if (Array.isArray(imageUrls)) {
        await tx.imagemImovel.deleteMany({ where: { imovelId: propertyId } });
        await tx.imagemImovel.createMany({
          data: imageUrls.map((url: string) => ({
            url: url,
            imovelId: propertyId,
          })),
        });
      }

      return property;
    });

    return NextResponse.json({ success: true, property: updatedProperty });
  } catch (error) {
    console.error('Erro ao ATUALIZAR imóvel:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Corpo da requisição inválido. Esperava-se um JSON.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar o imóvel.' },
      { status: 500 }
    );
  }
}
