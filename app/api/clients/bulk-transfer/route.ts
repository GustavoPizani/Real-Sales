// app/api/clients/bulk-transfer/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  clientIds: z.array(z.string()).min(1),
  brokerId: z.string().min(1),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: "Apenas administradores de marketing podem transferir clientes em massa." }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const { clientIds, brokerId } = parsed.data;

    const targetBroker = await prisma.user.findUnique({
      where: { id: brokerId },
      select: { id: true, accountId: true },
    });
    if (!targetBroker || (!user.isSuperAdmin && targetBroker.accountId !== user.accountId)) {
      return NextResponse.json({ error: "Corretor de destino inválido." }, { status: 400 });
    }

    const result = await prisma.client.updateMany({
      where: {
        id: { in: clientIds },
        accountId: user.isSuperAdmin ? undefined : user.accountId,
      },
      data: { brokerId: targetBroker.id },
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch (error) {
    console.error("Erro ao transferir clientes em massa:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
