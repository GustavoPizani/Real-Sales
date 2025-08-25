// app/api/clients/[id]/notes/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// POST: Adiciona uma nova nota a um cliente
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params; // ID do cliente
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'O conteúdo da nota é obrigatório.' },
        { status: 400 }
      );
    }

    const newNote = await prisma.note.create({
      data: {
        content,
        createdBy: user.name, // Salva o nome do usuário que criou a nota
        clientId: id,
      },
    });

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar nota:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao adicionar nota.' },
      { status: 500 }
    );
  }
}
