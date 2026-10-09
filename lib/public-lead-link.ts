// lib/public-lead-link.ts
import { prisma } from '@/lib/prisma';

/**
 * Para quem vai o lead de um link público de imóvel.
 * O link precisa trazer um corretor (brokerId) ou uma roleta (roletaId) válidos;
 * sem isso não há para quem entregar o lead, e a página mostra erro em vez do imóvel.
 */
export type LeadLink =
  | { ok: true; mode: 'direct'; broker: { id: string; name: string; accountId: string | null; role: string } }
  | { ok: true; mode: 'roleta'; roleta: { id: string; funnelId: string | null } }
  | { ok: false; reason: string };

export async function resolveLeadLink(brokerId?: string | null, roletaId?: string | null): Promise<LeadLink> {
  if (roletaId) {
    const roleta = await prisma.leadRoulette.findUnique({
      where: { id: roletaId },
      select: { id: true, funnelId: true, isActive: true, validFrom: true, validUntil: true, _count: { select: { users: true } } },
    });
    const now = new Date();
    if (!roleta) return { ok: false, reason: 'Roleta não encontrada.' };
    if (!roleta.isActive) return { ok: false, reason: 'Roleta desativada.' };
    if (roleta.validFrom && roleta.validFrom > now) return { ok: false, reason: 'Roleta ainda não está em vigor.' };
    if (roleta.validUntil && roleta.validUntil < now) return { ok: false, reason: 'Roleta fora da validade.' };
    if (roleta._count.users === 0) return { ok: false, reason: 'Roleta sem corretores.' };
    return { ok: true, mode: 'roleta', roleta: { id: roleta.id, funnelId: roleta.funnelId } };
  }

  if (brokerId) {
    const broker = await prisma.user.findUnique({
      where: { id: brokerId },
      select: { id: true, name: true, accountId: true, role: true },
    });
    if (!broker) return { ok: false, reason: 'Corretor não encontrado.' };
    return { ok: true, mode: 'direct', broker };
  }

  return { ok: false, reason: 'Link sem corretor nem roleta.' };
}

/**
 * Passa a vez na roleta: pega quem está há mais tempo sem receber (quem nunca
 * recebeu entra primeiro) e marca a vez no mesmo passo. A marcação só vale se
 * ninguém mexeu naquele corretor entre a leitura e a escrita; se dois cadastros
 * chegarem juntos, o segundo tenta de novo e pega o próximo da fila.
 */
export async function claimNextRouletteUser(rouletteId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = await prisma.leadRouletteUser.findFirst({
      where: { rouletteId },
      orderBy: { lastAssignedAt: { sort: 'asc', nulls: 'first' } },
    });
    if (!next) return null;

    const claimed = await prisma.leadRouletteUser.updateMany({
      where: { rouletteId, userId: next.userId, lastAssignedAt: next.lastAssignedAt },
      data: { lastAssignedAt: new Date() },
    });
    if (claimed.count === 1) return next.userId;
  }
  return null;
}
