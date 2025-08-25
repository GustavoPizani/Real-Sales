// app/api/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET: Busca todas as tarefas com base nos filtros
export async function GET(request: NextRequest) {
  try {
    // Autentica o usuário a partir do token na requisição
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');

    // Monta a cláusula 'where' do Prisma dinamicamente com base nos filtros
    const where: Prisma.TarefaWhereInput = {};

    if (status) {
      // O schema não tem status, mas se tivesse, seria algo como:
      // where.status = status; 
    }
    if (clientId) {
      where.clienteId = clientId;
    }
    // Adicionar filtro para ver apenas as tarefas do usuário logado ou de seus subordinados se necessário
    // where.usuarioId = user.id;

    const tasks = await prisma.tarefa.findMany({
      where,
      include: {
        cliente: {
          select: { nomeCompleto: true },
        },
        usuario: {
          select: { nome: true },
        },
      },
      orderBy: {
        dataHora: 'asc',
      },
    });

    // Formata a resposta para corresponder ao que o frontend espera
    const formattedTasks = tasks.map(task => ({
      ...task,
      client_name: task.cliente.nomeCompleto,
      assigned_user_name: task.usuario.nome,
    }));

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar tarefas.' },
      { status: 500 }
    );
  }
}

// POST: Cria uma nova tarefa
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { title, description, due_date, client_id } = await request.json();

    if (!title || !due_date || !client_id) {
      return NextResponse.json(
        { error: 'Título, data de vencimento e cliente são obrigatórios.' },
        { status: 400 }
      );
    }

    const newTask = await prisma.tarefa.create({
      data: {
        titulo: title,
        descricao: description,
        dataHora: new Date(due_date),
        clienteId: client_id,
        usuarioId: user.id, // Atribui a tarefa ao usuário que a criou
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar tarefa.' },
      { status: 500 }
    );
  }
}
