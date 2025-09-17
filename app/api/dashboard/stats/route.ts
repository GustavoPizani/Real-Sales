// app/api/dashboard/stats/route.ts

import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { Role } from '@prisma/client'

// Força a rota a ser sempre dinâmica, resolvendo o erro de build da Vercel.
export const dynamic = 'force-dynamic';

async function getSubordinateIds(userId: string): Promise<string[]> {
  let idsToProcess = [userId];
  const allSubordinateIds = new Set<string>();

  while (idsToProcess.length > 0) {
    const currentLevelIds = await prisma.usuario.findMany({
      where: { superiorId: { in: idsToProcess } },
      select: { id: true },
    });

    const newIds = currentLevelIds.map(u => u.id);
    if (newIds.length === 0) {
      break;
    }

    newIds.forEach(id => allSubordinateIds.add(id));
    idsToProcess = newIds;
  }

  return Array.from(allSubordinateIds);
}

export async function GET() {
  try {
    // Utiliza a função centralizada para obter o usuário, que é mais segura e limpa.
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let userIdsForFilter: string[] = [];

    if (user.role === Role.marketing_adm) {
      // Admin vê todos. Deixar o filtro `in` vazio busca de todos os usuários.
      // Se corretorId for opcional, precisamos de uma lógica diferente.
      // Assumindo que queremos todos os clientes com um corretor atribuído.
    } else if (user.role === Role.diretor || user.role === Role.gerente) {
      userIdsForFilter = [user.id, ...(await getSubordinateIds(user.id))];
    } else { // Para corretor, pre_vendas, etc.
      userIdsForFilter = [user.id];
    }

    // Agrupa as consultas para melhor performance
    const [hierarchicalTotalClients, hierarchicalActiveClients, totalProperties] = await prisma.$transaction([
      prisma.cliente.count({
        where: { 
          ...(userIdsForFilter.length > 0 && { corretorId: { in: userIdsForFilter } })
        },
      }),
      prisma.cliente.count({
        where: { 
          ...(userIdsForFilter.length > 0 && { corretorId: { in: userIdsForFilter } }),
          overallStatus: 'Ativo' },
      }),
      prisma.imovel.count()
    ]);

    const conversionRate =
      hierarchicalTotalClients > 0
        ? (hierarchicalActiveClients / hierarchicalTotalClients) * 100
        : 0

    return NextResponse.json({
      hierarchicalTotalClients,
      hierarchicalActiveClients,
      totalProperties,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar estatísticas.' },
      { status: 500 }
    )
  }
}
