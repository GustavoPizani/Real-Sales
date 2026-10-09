import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Contadores mostrados ao lado dos itens do menu lateral. */
export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const overdueTasks = await prisma.task.count({
      where: { userId: user.id, isCompleted: false, dateTime: { lt: new Date() } },
    });

    return NextResponse.json({ overdueTasks });
  } catch (error) {
    console.error('Erro ao buscar contadores do menu:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
