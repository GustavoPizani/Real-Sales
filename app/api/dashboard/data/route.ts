import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, ClientOverallStatus, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

async function getSubordinateIds(userId: string): Promise<string[]> {
  let idsToProcess = [userId];
  const allSubordinateIds = new Set<string>();

  while (idsToProcess.length > 0) {
    const currentLevelIds = await prisma.user.findMany({
      where: { supervisorId: { in: idsToProcess } },
      select: { id: true },
    });
    const newIds = currentLevelIds.map(u => u.id);
    if (newIds.length === 0) break;
    newIds.forEach(id => allSubordinateIds.add(id));
    idsToProcess = newIds;
  }

  return Array.from(allSubordinateIds);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    let userIdsForFilter: string[] = [];
    if (user.role !== Role.MARKETING_ADMIN) {
      if (user.role === Role.DIRECTOR || user.role === Role.MANAGER) {
        userIdsForFilter = [user.id, ...(await getSubordinateIds(user.id))];
      } else {
        userIdsForFilter = [user.id];
      }
    }

    const tenantWhere: Prisma.ClientWhereInput = {
      broker: { accountId: user.accountId },
      ...(userIdsForFilter.length > 0 && { brokerId: { in: userIdsForFilter } }),
    };

    const sevenDaysAgo = subDays(new Date(), 7);
    const now = new Date();

    const [
      hierarchicalTotalClients,
      hierarchicalActiveClients,
      totalProperties,
      overdueClients,
      tasks,
    ] = await Promise.all([
      prisma.client.count({ where: tenantWhere }),
      prisma.client.count({ where: { ...tenantWhere, overallStatus: ClientOverallStatus.ACTIVE } }),
      prisma.property.count(),
      prisma.client.findMany({
        where: {
          brokerId: user.id,
          updatedAt: { lt: sevenDaysAgo },
          overallStatus: { notIn: [ClientOverallStatus.WON, ClientOverallStatus.LOST] },
        },
        select: { id: true, fullName: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
        take: 20,
      }),
      prisma.task.findMany({
        where: { userId: user.id, isCompleted: false },
        select: {
          id: true,
          title: true,
          dateTime: true,
          isCompleted: true,
          clientId: true,
          client: { select: { id: true, fullName: true } },
        },
        orderBy: { dateTime: 'asc' },
        take: 30,
      }),
    ]);

    const conversionRate =
      hierarchicalTotalClients > 0
        ? parseFloat(((hierarchicalActiveClients / hierarchicalTotalClients) * 100).toFixed(2))
        : 0;

    const pendingTasks = tasks.filter(t => new Date(t.dateTime) >= now);
    const overdueTasks = tasks.filter(t => new Date(t.dateTime) < now);

    return NextResponse.json({
      stats: { hierarchicalTotalClients, hierarchicalActiveClients, totalProperties, conversionRate },
      overdueClients,
      pendingTasks,
      overdueTasks,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
