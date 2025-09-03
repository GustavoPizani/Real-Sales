import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Token de autenticação não encontrado' }, { status: 401 });
    }

    const user = await getUserFromToken(token);

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