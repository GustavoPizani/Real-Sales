// app/api/notes/[noteId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT: Atualiza uma anotação existente
export async function PUT(request: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { noteId } = params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'O conteúdo da anotação é obrigatório.' }, { status: 400 });
    }

    const updatedNote = await prisma.nota.update({
      where: { id: noteId },
      data: {
        content,
        // Opcional: registrar quem editou, se houver um campo para isso.
        // editedBy: user.name,
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Erro ao atualizar anotação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar anotação.' },
      { status: 500 }
    );
  }
}

// DELETE: Exclui uma anotação
export async function DELETE(request: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { noteId } = params;

    // Opcional: Verificar se o usuário tem permissão para excluir a nota
    // (ex: só o criador ou um admin pode excluir)

    await prisma.nota.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ message: 'Anotação excluída com sucesso.' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao excluir anotação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir anotação.' },
      { status: 500 }
    );
  }
}

