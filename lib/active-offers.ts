// lib/active-offers.ts
// Compartilhado entre criação de campanha e "adicionar mais clientes" a uma campanha existente.
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, ClientOverallStatus, Prisma } from '@prisma/client';

type User = NonNullable<Awaited<ReturnType<typeof getUserFromToken>>>;

export type InternalClientFilter = {
  source: string;
  propertyOfInterestId?: string;
  brokerId?: string;
};

export async function buildLostClientWhere(
  user: User,
  { source, propertyOfInterestId, brokerId }: InternalClientFilter
): Promise<{ where: Prisma.ClientWhereInput; defaultPropertyOfInterestId?: string } | { error: string; status: number }> {
  const where: Prisma.ClientWhereInput = {
    overallStatus: ClientOverallStatus.LOST,
    accountId: user.isSuperAdmin ? undefined : user.accountId,
  };

  if (source === 'meus_clientes') {
    where.brokerId = user.id;
  } else if (source === 'equipe' && user.role === Role.MARKETING_ADMIN) {
    const subordinateIds = (await prisma.user.findMany({ where: { supervisorId: user.id }, select: { id: true } })).map(u => u.id);
    const allowedBrokerIds = [user.id, ...subordinateIds];

    if (brokerId) {
      if (!allowedBrokerIds.includes(brokerId)) {
        return { error: 'Esse corretor não está na sua equipe.', status: 403 };
      }
      where.brokerId = brokerId;
    } else {
      where.brokerId = { in: allowedBrokerIds };
    }
  } else {
    return { error: 'Permissão negada para esta fonte de clientes.', status: 403 };
  }

  if (propertyOfInterestId === 'NONE') {
    where.propertyOfInterestId = null;
  } else if (propertyOfInterestId) {
    where.propertyOfInterestId = propertyOfInterestId;
  }

  const defaultPropertyOfInterestId = propertyOfInterestId && propertyOfInterestId !== 'NONE' ? propertyOfInterestId : undefined;

  return { where, defaultPropertyOfInterestId };
}
