// app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

async function getClientWithDetails(id: string) {
  return await prisma.cliente.findUnique({
    where: { id },
    include: {
      corretor: {
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          superior: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      imovelDeInteresse: true,
      notas: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      tarefas: {
        orderBy: {
          dataHora: 'desc',
        },
      },
    },
  });
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const client = await getClientWithDetails(id);

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const dataToUpdate: Prisma.ClienteUpdateInput = {};

    if (body.fullName !== undefined) dataToUpdate.nomeCompleto = body.fullName;
    if (body.email !== undefined) dataToUpdate.email = body.email;
    if (body.phone !== undefined) dataToUpdate.telefone = body.phone;
    if (body.status !== undefined) dataToUpdate.currentFunnelStage = body.status;
    if (body.budget !== undefined) dataToUpdate.budget = parseFloat(body.budget) || null;
    if (body.preferences !== undefined) dataToUpdate.preferences = body.preferences;
    if (body.assigned_to !== undefined) {
      dataToUpdate.corretor = { connect: { id: body.assigned_to } };
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 });
    }

    const updatedClient = await prisma.cliente.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}