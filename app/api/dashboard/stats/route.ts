// app/api/dashboard/stats/route.ts

import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
// TODO: Replace getUserFromToken with Supabase auth helpers
import { getUserFromToken } from '@/lib/auth'
import { Role, ClientOverallStatus, Prisma } from '@prisma/client'

// Força a rota a ser sempre dinâmica, resolvendo o erro de build da Vercel.
export const dynamic = 'force-dynamic';

async function getSubordinateIds(userId: string): Promise<string[]> {
  let idsToProcess = [userId];
  const allSubordinateIds = new Set<string>();

  while (idsToProcess.length > 0) {
    const currentLevelIds = await prisma.user.findMany({
      // Corrected field name from 'superiorId' to 'supervisorId'
      where: { supervisorId: { in: idsToProcess } },
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

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with Supabase session logic
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let userIdsForFilter: string[] = [];

    if (user.role === Role.MARKETING_ADMIN) {
      // Admin sees all. An empty userIdsForFilter array means no filter by brokerId will be applied.
    } else if (user.role === Role.DIRECTOR || user.role === Role.MANAGER) {
      userIdsForFilter = [user.id, ...(await getSubordinateIds(user.id))];
    } else { // For BROKER, PRE_SALES, etc.
      userIdsForFilter = [user.id];
    }

    // Base filter for the tenant. The 'accountId' is on the User model.
    // We filter clients based on the brokers who belong to the account.
    const tenantWhere: Prisma.ClientWhereInput = {
      broker: {
        accountId: user.accountId,
      },
    };

    // Agrupa as consultas para melhor performance
    const [hierarchicalTotalClients, hierarchicalActiveClients, totalProperties] = await prisma.$transaction([
      prisma.client.count({
        where: {
          ...tenantWhere,
          ...(userIdsForFilter.length > 0 && { brokerId: { in: userIdsForFilter } }),
        },
      }),
      prisma.client.count({
        where: {
          ...tenantWhere,
          ...(userIdsForFilter.length > 0 && { brokerId: { in: userIdsForFilter } }),
          overallStatus: ClientOverallStatus.ACTIVE,
        },
      }),
      // The Property model does not have an accountId.
      // This count will be for all properties in the database.
      // To filter by tenant, the Property model would need an accountId or a relation to a user.
      prisma.property.count(),
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
