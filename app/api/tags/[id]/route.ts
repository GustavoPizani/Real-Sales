// app/api/tags/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT: Atualiza uma etiqueta existente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, color } = await request.json();
    const { id } = params;

    if (!name || !color) {
      return NextResponse.json({ error: 'Nome e cor são obrigatórios.' }, { status: 400 });
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: { name, color },
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Erro ao atualizar etiqueta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar etiqueta.' },
      { status: 500 }
    );
  }
}

// DELETE: Exclui uma etiqueta
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;

    // O Prisma cuidará da remoção da relação na tabela `_ClienteTags`
    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Etiqueta excluída com sucesso.' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao excluir etiqueta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir etiqueta.' },
      { status: 500 }
    );
  }
}


