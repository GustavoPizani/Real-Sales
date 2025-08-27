import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/lib/auth'; // Assumindo que você tem este helper
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const sevenDaysAgo = subDays(new Date(), 7);

    // Encontra clientes atribuídos ao usuário logado (corretor)
    // cuja última atualização foi há mais de 7 dias.
    const overdueClients = await prisma.cliente.findMany({
      where: {
        corretorId: user.id, // Filtra pelo usuário logado
        updatedAt: {
          lt: sevenDaysAgo, // 'lt' significa "menor que" (less than)
        },
        // Opcional: você pode querer excluir clientes com status finalizados
        overallStatus: {
          notIn: ['Perdido', 'Ganho']
        }
      },
      select: {
        id: true,
        nomeCompleto: true,
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