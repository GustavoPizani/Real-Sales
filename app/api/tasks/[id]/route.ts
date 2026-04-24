// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { id: true, fullName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error('Erro ao buscar tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.task.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

    const body = await request.json();
    const title: string = body.title;
    const description: string | undefined = body.description;
    const dateTime: string | undefined = body.dateTime ?? body.due_date;
    const clientId: string | undefined = body.clientId ?? body.clienteId ?? body.client_id;
    const isCompleted: boolean | undefined = body.isCompleted ?? body.concluida;

    if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        title,
        description: description !== undefined ? description : undefined,
        dateTime: dateTime ? new Date(dateTime) : undefined,
        clientId: clientId ?? undefined,
        isCompleted: isCompleted !== undefined ? isCompleted : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

    const body = await request.json();
    const data: Record<string, any> = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.dateTime !== undefined) data.dateTime = new Date(body.dateTime);
    if (body.due_date !== undefined) data.dateTime = new Date(body.due_date);
    if (body.clientId !== undefined) data.clientId = body.clientId;
    if (body.clienteId !== undefined) data.clientId = body.clienteId;
    if (body.client_id !== undefined) data.clientId = body.client_id;
    // Aceita tanto isCompleted quanto o legado concluida
    if (body.isCompleted !== undefined) data.isCompleted = body.isCompleted;
    if (body.concluida !== undefined) data.isCompleted = body.concluida;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    const updated = await prisma.task.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const existing = await prisma.task.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Tarefa removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
