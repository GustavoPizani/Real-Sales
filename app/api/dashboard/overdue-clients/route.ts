import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ClientOverallStatus } from '@prisma/client';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const sevenDaysAgo = subDays(new Date(), 7);

    const overdueClients = await prisma.client.findMany({
      where: {
        brokerId: user.id,
        updatedAt: {
          lt: sevenDaysAgo,
        },
        overallStatus: {
          notIn: [ClientOverallStatus.WON, ClientOverallStatus.LOST],
        },
      },
      select: {
        id: true,
        fullName: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'asc', // Mostra os clientes mais antigos primeiro
      },
    });

    return NextResponse.json(overdueClients);

  } catch (error) {
    console.error('Erro ao buscar clientes em atraso:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}