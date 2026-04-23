// app/api/clients/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * Fetches a single client with detailed information.
 */
async function getClientWithDetails(id: string) {
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            broker: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    supervisor: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            propertyOfInterest: {
                include: {
                    propertyTypes: true,
                },
            },
            funnel: {
                select: {
                    name: true,
                },
            },
            funnelStage: {
                select: {
                    name: true,
                },
            },
            documents: true,
            notes: {
                orderBy: { id: 'desc' },
            },
            tasks: {
                orderBy: {
                    dateTime: 'desc',
                },
            },
            tags: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                },
            },
        },
    });
    return client;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      propertyOfInterestId,
      brokerId,
      funnelStageId,
      overallStatus,
      tagIds,
      detalhesDeVenda,
    } = body;

    const updateData: Record<string, any> = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (propertyOfInterestId !== undefined) updateData.propertyOfInterestId = propertyOfInterestId || null;
    if (brokerId !== undefined) updateData.brokerId = brokerId;
    if (funnelStageId !== undefined) updateData.funnelStageId = funnelStageId;
    if (overallStatus !== undefined) updateData.overallStatus = overallStatus;

    if (tagIds !== undefined) {
      updateData.tags = {
        set: tagIds.map((id: string) => ({ id })),
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: params.id },
        data: updateData,
      });

      if (overallStatus === 'WON' && detalhesDeVenda) {
        await tx.clientWonDetails.upsert({
          where: { clientId: params.id },
          update: { saleValue: parseFloat(detalhesDeVenda.sale_value) || 0 },
          create: {
            clientId: params.id,
            saleValue: parseFloat(detalhesDeVenda.sale_value) || 0,
          },
        });
      }
    });

    const updatedClient = await getClientWithDetails(params.id);
    return NextResponse.json({ client: updatedClient });

  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const client = await getClientWithDetails(params.id);

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ client });

  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}