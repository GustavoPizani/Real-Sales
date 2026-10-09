// lib/dashboard-scope.ts
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import type { UserPayload } from '@/lib/auth';
import { hideTestUsers } from '@/lib/test-account';

export type DashboardView = 'admin' | 'manager' | 'broker';

export interface DashboardScope {
  view: DashboardView;
  brokers: { id: string; name: string }[];
  brokerIds: string[];
}

/**
 * Define o que o usuário enxerga no dashboard.
 * - MARKETING_ADMIN: todos os usuários (mesma regra de /api/users).
 * - BROKER com subordinados (supervisorId apontando pra ele): ele + a equipe.
 * - BROKER sem subordinados: só ele.
 * Não existe papel "gerente" no banco — gerente é quem tem equipe.
 * A conta de teste fica de fora para todos, menos para ela mesma.
 */
export async function resolveDashboardScope(user: UserPayload): Promise<DashboardScope> {
  if (user.role === Role.MARKETING_ADMIN) {
    const brokers = await prisma.user.findMany({
      where: { accountId: user.isSuperAdmin ? undefined : user.accountId, ...hideTestUsers(user) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { view: 'admin', brokers, brokerIds: brokers.map(b => b.id) };
  }

  const team = await prisma.user.findMany({
    where: { supervisorId: user.id, ...hideTestUsers(user) },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  const self = { id: user.id, name: user.name };

  if (team.length > 0) {
    const brokers = [self, ...team.filter(b => b.id !== user.id)];
    return { view: 'manager', brokers, brokerIds: brokers.map(b => b.id) };
  }

  return { view: 'broker', brokers: [self], brokerIds: [user.id] };
}
