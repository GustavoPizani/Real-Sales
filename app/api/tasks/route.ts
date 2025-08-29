// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tasks = await prisma.tarefa.findMany({
      where: { usuarioId: user.id },
      include: {
        cliente: {
          select: {
            id: true,
            nomeCompleto: true,
          },
        },
      },
      orderBy: {
        dataHora: 'asc',
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { title, description, due_date, client_id } = await request.json();

    if (!title || !due_date || !client_id) {
      return NextResponse.json(
        { error: 'Título, data e cliente são obrigatórios.' },
        { status: 400 }
      );
    }

    // Usar uma transação para garantir que ambas as operações (criar tarefa e atualizar cliente)
    // sejam concluídas com sucesso ou revertidas juntas.
    const [newTask] = await prisma.$transaction([
      prisma.tarefa.create({
        data: {
          titulo: title,
          descricao: description,
          dataHora: new Date(due_date),
          clienteId: client_id,
          usuarioId: user.id,
        },
      }),
      prisma.cliente.update({
        where: { id: client_id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}