import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Exemplo de handler DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deletedReason = await prisma.lostReason.delete({
      where: { id: params.id },
    });
    return NextResponse.json(deletedReason);
  } catch (error) {
    console.error('Erro ao deletar motivo de perda:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Handler PUT com a correção
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reason, active } = await request.json();
    const updatedReason = await prisma.lostReason.update({
      where: { id: params.id },
      data: { reason, active },
    });
    return NextResponse.json(updatedReason);
  } catch (error) {
    console.error('Erro ao atualizar motivo de perda:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} // <-- A chave '}' que faltava foi adicionada aqui.
