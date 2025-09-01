// app/api/clients/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Função auxiliar para buscar cliente com detalhes
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
      tarefas: { // A busca de tarefas foi mantida simples, sem ordenar por campos inexistentes
        orderBy: {
          dataHora: 'desc',
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
    
    return NextResponse.json({ client });
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

    const dataToUpdate: Prisma.ClienteUpdateInput = {};

    // Corrigido para corresponder aos nomes enviados pelo frontend
    if (body.nomeCompleto !== undefined) dataToUpdate.nomeCompleto = body.nomeCompleto;
    if (body.email !== undefined) dataToUpdate.email = body.email;
    if (body.telefone !== undefined) dataToUpdate.telefone = body.telefone;

    // Adicionado suporte para outros campos de atualização
    if (body.currentFunnelStage !== undefined) dataToUpdate.currentFunnelStage = body.currentFunnelStage;
    if (body.imovelDeInteresseId !== undefined) dataToUpdate.imovelDeInteresseId = body.imovelDeInteresseId;
    if (body.overallStatus !== undefined) dataToUpdate.overallStatus = body.overallStatus;
    if (body.sale_value !== undefined) dataToUpdate.sale_value = body.sale_value;
    if (body.sale_date !== undefined) dataToUpdate.sale_date = new Date(body.sale_date);
    if (body.preferences !== undefined) dataToUpdate.preferences = body.preferences;

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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}