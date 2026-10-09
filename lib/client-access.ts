// lib/client-access.ts
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import type { UserPayload } from '@/lib/auth';

export type ClientAccess = 'ok' | 'not_found' | 'forbidden';

/**
 * Quem pode ver e alterar um cliente:
 * - administrador (mesma regra da lista em /api/clients);
 * - o corretor responsável;
 * - quem cadastrou o cliente;
 * - o corretor para quem o lead foi qualificado;
 * - o supervisor do corretor responsável (gerente da equipe).
 */
export async function checkClientAccess(user: UserPayload, clientId: string): Promise<ClientAccess> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      brokerId: true,
      createdById: true,
      qualifiedForId: true,
      broker: { select: { supervisorId: true } },
    },
  });
  if (!client) return 'not_found';
  if (user.role === Role.MARKETING_ADMIN) return 'ok';

  const allowed =
    client.brokerId === user.id ||
    client.createdById === user.id ||
    client.qualifiedForId === user.id ||
    client.broker.supervisorId === user.id;
  return allowed ? 'ok' : 'forbidden';
}
