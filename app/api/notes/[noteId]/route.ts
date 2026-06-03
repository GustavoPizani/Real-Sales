import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { noteId } = params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'O conteúdo da anotação é obrigatório.' }, { status: 400 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: { content },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Erro ao atualizar anotação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { noteId } = params;

    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ message: 'Anotação excluída com sucesso.' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao excluir anotação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
