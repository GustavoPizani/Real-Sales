// app/api/lost-reasons/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';

async function checkAdmin(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user || user.role !== Role.marketing_adm) {
    return null;
  }
  return user;
}

// PUT: Atualiza um motivo de perda
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAdmin(request))) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { reason } = await request.json();
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json({ error: 'O motivo é obrigatório.' }, { status: 400 });
    }

    const updatedReason = await prisma.lostReason.update({
      where: { id: params.id },
      data: { reason: reason.trim() },
    });

    return NextResponse.json(updatedReason);
  } catch (error) {
    console.error('Erro ao atualizar motivo de perda:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// DELETE: Remove um motivo de perda
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await checkAdmin(request))) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    await prisma.lostReason.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Motivo removido com sucesso' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Motivo não encontrado' }, { status: 404 });
    }
    console.error('Erro ao remover motivo de perda:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
