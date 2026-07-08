// app/api/active-offers/[id]/clients/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role, ClientOverallStatus } from "@prisma/client";
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  clientIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: "Apenas administradores de marketing podem enviar clientes para uma oferta ativa." }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const { clientIds } = parsed.data;

    const activeOffer = await prisma.activeOffer.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!activeOffer) {
      return NextResponse.json({ error: "Oferta ativa não encontrada." }, { status: 404 });
    }

    const eligibleClients = await prisma.client.findMany({
      where: {
        id: { in: clientIds },
        overallStatus: ClientOverallStatus.LOST,
        accountId: user.isSuperAdmin ? undefined : user.accountId,
      },
      select: { id: true, brokerId: true },
    });

    const skippedCount = clientIds.length - eligibleClients.length;

    if (eligibleClients.length === 0) {
      return NextResponse.json(
        { error: "Nenhum dos clientes selecionados está com status Perdido.", linkedCount: 0, alreadyLinkedCount: 0, skippedCount: clientIds.length },
        { status: 400 }
      );
    }

    const existingLinks = await prisma.activeOfferClient.findMany({
      where: { activeOfferId: activeOffer.id, clientId: { in: eligibleClients.map(c => c.id) } },
      select: { clientId: true },
    });
    const existingClientIds = new Set(existingLinks.map(l => l.clientId));

    const toCreate = eligibleClients.filter(c => !existingClientIds.has(c.id));
    const alreadyLinkedCount = eligibleClients.length - toCreate.length;

    if (toCreate.length > 0) {
      await prisma.activeOfferClient.createMany({
        data: toCreate.map(c => ({
          activeOfferId: activeOffer.id,
          clientId: c.id,
          assignedToId: c.brokerId,
        })),
      });
    }

    return NextResponse.json({
      linkedCount: toCreate.length,
      alreadyLinkedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Erro ao vincular clientes à oferta ativa:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
