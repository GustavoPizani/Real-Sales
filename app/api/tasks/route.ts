// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      include: {
        client: { select: { id: true, fullName: true } },
      },
      orderBy: { dateTime: 'asc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();

    // Aceita tanto os nomes novos quanto os antigos para compatibilidade
    const title: string = body.title;
    const description: string | undefined = body.description;
    const dateTime: string = body.dateTime ?? body.due_date;
    const clientId: string = body.clientId ?? body.clienteId ?? body.client_id;

    if (!title || !dateTime || !clientId) {
      return NextResponse.json({ error: 'Título, data e cliente são obrigatórios.' }, { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        dateTime: new Date(dateTime),
        clientId,
        userId: user.id,
        type: body.type ?? 'OTHER',
        priority: body.priority ?? 'MEDIUM',
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
