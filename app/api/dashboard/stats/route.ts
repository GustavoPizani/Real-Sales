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

export async function GET(req: NextRequest) {
  try {
    // Utiliza a função centralizada para obter o usuário, que é mais segura e limpa.
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let userIdsForFilter: string[] = [user.id]
    if (user.role === 'diretor' || user.role === 'gerente') {
      const subordinateIds = await getSubordinateIds(user.id)
      userIdsForFilter.push(...subordinateIds)
    }

    // Agrupa as consultas para melhor performance
    const [hierarchicalTotalClients, hierarchicalActiveClients, totalProperties] = await prisma.$transaction([
      prisma.cliente.count({
        where: { corretorId: { in: userIdsForFilter } },
      }),
      prisma.cliente.count({
        where: { corretorId: { in: userIdsForFilter }, overallStatus: 'Ativo' },
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
