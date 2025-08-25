// app/api/properties/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET: Busca uma propriedade específica pelo ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const property = await prisma.imovel.findUnique({
      where: { id: params.id },
      include: {
        // Inclui clientes que têm este imóvel como 'imovelDeInteresse'
        clientesComInteresse: {
          select: {
            id: true,
            nomeCompleto: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error(`Erro ao buscar imóvel com ID ${params.id}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// PUT: Atualiza uma propriedade existente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      titulo, description, address, preco, area,
      quartos, banheiros, tipo, status
    } = data;

    // Prepara os dados para atualização, convertendo os tipos quando necessário
    const dataToUpdate: Prisma.ImovelUpdateInput = {
      titulo,
      descricao,
      endereco: address,
      preco: preco ? parseFloat(preco) : undefined,
      area: area ? parseInt(area) : undefined,
      quartos: quartos ? parseInt(quartos) : undefined,
      banheiros: banheiros ? parseInt(banheiros) : undefined,
      tipo,
      status,
    };

    const updatedProperty = await prisma.imovel.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error(`Erro ao atualizar imóvel com ID ${params.id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// DELETE: Remove uma propriedade
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // O Prisma vai gerar um erro por padrão se houver clientes associados,
    // devido à constraint da foreign key. Podemos tratar esse erro específico.
    await prisma.imovel.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Imóvel removido com sucesso' });
  } catch (error) {
    console.error(`Erro ao remover imóvel com ID ${params.id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      // Foreign key constraint failed
      return NextResponse.json(
        { error: 'Não é possível remover o imóvel pois há clientes associados a ele.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
