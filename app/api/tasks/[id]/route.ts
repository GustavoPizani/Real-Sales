// app/api/tasks/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// GET: Busca uma tarefa específica pelo ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const task = await prisma.tarefa.findUnique({
      where: { id: params.id },
      include: {
        cliente: { select: { id: true, nomeCompleto: true } },
        usuario: { select: { nome: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    // Adicionar verificação de permissão aqui se necessário
    // Ex: if (task.usuarioId !== user.id && user.role !== 'gerente') { ... }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Erro ao buscar tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// PUT: Atualiza uma tarefa existente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica se a tarefa existe antes de tentar atualizar
    const existingTask = await prisma.tarefa.findUnique({ where: { id: params.id } });
    if (!existingTask) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }
    // Adicionar verificação de permissão aqui (ex: if (existingTask.usuarioId !== user.id) ...)

    const { title, description, due_date, client_id, concluida } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    const updatedTask = await prisma.tarefa.update({
      where: { id: params.id },
      data: {
        titulo: title,
        descricao: description,
        dataHora: due_date ? new Date(due_date) : undefined,
        clienteId: client_id,
        concluida: concluida,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// PATCH: Atualiza parcialmente uma tarefa (ex: marcar como concluída)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica se a tarefa existe e se o usuário tem permissão
    const task = await prisma.tarefa.findUnique({ where: { id: params.id } });
    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }
    // Adicionar verificação de permissão aqui (ex: if (task.usuarioId !== user.id) ...)

    const body = await request.json();
    const dataToUpdate: any = {};

    // Constrói o objeto de dados apenas com os campos fornecidos
    if (body.title !== undefined) dataToUpdate.titulo = body.title;
    if (body.description !== undefined) dataToUpdate.descricao = body.description;
    if (body.due_date !== undefined) dataToUpdate.dataHora = new Date(body.due_date);
    if (body.client_id !== undefined) dataToUpdate.clienteId = body.client_id;
    if (body.concluida !== undefined) dataToUpdate.concluida = body.concluida;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar fornecido.' }, { status: 400 });
    }

    const updatedTask = await prisma.tarefa.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Erro ao atualizar tarefa parcialmente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// DELETE: Remove uma tarefa
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica se a tarefa existe antes de tentar excluir
    const existingTask = await prisma.tarefa.findUnique({ where: { id: params.id } });
    if (!existingTask) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }
    // Adicionar verificação de permissão aqui (ex: if (existingTask.usuarioId !== user.id) ...)

    await prisma.tarefa.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Tarefa removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
