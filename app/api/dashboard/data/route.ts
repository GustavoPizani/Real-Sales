import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { resolveDashboardScope } from '@/lib/dashboard-scope';
import { ClientOverallStatus, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

const TASK_LIMIT = 200;
const STALE_LIMIT = 100;
const STALE_DAYS = 7;

/**
 * Fila de trabalho do dashboard: tarefas em aberto e clientes sem atualização.
 * Gerente recebe a fila da equipe inteira; admin e corretor recebem a própria.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const scope = await resolveDashboardScope(user);
    const ownerIds = scope.view === 'manager' ? scope.brokerIds : [user.id];

    const now = new Date();
    const taskWhere: Prisma.TaskWhereInput = { userId: { in: ownerIds }, isCompleted: false };
    const staleWhere: Prisma.ClientWhereInput = {
      brokerId: { in: ownerIds },
      updatedAt: { lt: subDays(now, STALE_DAYS) },
      overallStatus: ClientOverallStatus.ACTIVE,
    };

    const [tasks, openTasks, overdueTasks, staleClients, staleTotal, activeClients] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          title: true,
          dateTime: true,
          type: true,
          priority: true,
          clientId: true,
          client: { select: { id: true, fullName: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { dateTime: 'asc' },
        take: TASK_LIMIT,
      }),
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, dateTime: { lt: now } } }),
      prisma.client.findMany({
        where: staleWhere,
        select: {
          id: true,
          fullName: true,
          updatedAt: true,
          broker: { select: { id: true, name: true } },
          funnelStage: { select: { name: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: STALE_LIMIT,
      }),
      prisma.client.count({ where: staleWhere }),
      prisma.client.count({ where: { brokerId: { in: ownerIds }, overallStatus: ClientOverallStatus.ACTIVE } }),
    ]);

    return NextResponse.json({
      view: scope.view,
      brokers: scope.brokers,
      tasks,
      staleClients,
      totals: { openTasks, overdueTasks, staleClients: staleTotal, activeClients },
      staleDays: STALE_DAYS,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
