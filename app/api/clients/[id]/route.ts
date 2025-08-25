// app/api/clients/[id]/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Função auxiliar para buscar cliente com detalhes
async function getClientWithDetails(id: string) {
  return await prisma.client.findUnique({
    where: { id },
    include: {
      broker: { // Corrigido de 'corretor' para 'broker'
        select: {
          id: true,
          name: true, // Corrigido de 'nome' para 'name'
          email: true,
          role: true,
          superior: {
            select: {
              id: true,
              name: true, // Corrigido de 'nome' para 'name'
            },
          },
        },
      },
      propertyOfInterest: true, // Corrigido de 'imovelDeInteresse'
      notes: { // Corrigido de 'notas'
        orderBy: {
          createdAt: 'desc',
        },
      },
      tasks: { // Corrigido de 'tarefas'
        orderBy: {
          dueDate: 'desc', // Corrigido de 'dataHora'
        },
      },
    },
  });
}

// GET: Retorna um único cliente com seus dados relacionados
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

    return NextResponse.json({
      client,
      interestedProperty: client.propertyOfInterest,
      clientTasks: client.tasks,
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT: Atualiza um cliente
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const dataToUpdate: Prisma.ClientUpdateInput = {};

    // Atualização de informações do cliente (usando novos nomes do schema)
    if (body.name !== undefined) dataToUpdate.fullName = body.name;
    if (body.email !== undefined) dataToUpdate.email = body.email;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body.status !== undefined) dataToUpdate.currentFunnelStage = body.status;
    if (body.budget !== undefined) dataToUpdate.budget = parseFloat(body.budget) || null;
    if (body.preferences !== undefined) dataToUpdate.preferences = body.preferences;

    // Atualização de atribuição
    if (body.assigned_to) {
      dataToUpdate.broker = { connect: { id: body.assigned_to } };
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 });
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
