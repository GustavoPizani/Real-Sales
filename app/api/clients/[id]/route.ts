// app/api/clients/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { checkClientAccess } from "@/lib/client-access";

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
                orderBy: { createdAt: 'desc' },
                include: {
                    author: { select: { id: true, name: true } },
                },
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

    // Antes bastava estar logado: qualquer usuário alterava qualquer cliente pelo ID.
    const access = await checkClientAccess(user, params.id);
    if (access === 'not_found') return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    if (access === 'forbidden') return NextResponse.json({ error: "Você não tem acesso a este cliente." }, { status: 403 });

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

    // A data da venda informada na tela vai para o evento de "ganho" que o
    // trigger acabou de gravar em client_stage_events. Fora da transação e
    // tolerante a falha: sem a tabela de histórico, marcar a venda continua funcionando.
    const saleDate = detalhesDeVenda?.sale_date ? new Date(detalhesDeVenda.sale_date) : null;
    if (overallStatus === 'WON' && saleDate && !isNaN(saleDate.getTime())) {
      try {
        const wonEvent = await prisma.clientStageEvent.findFirst({
          where: { clientId: params.id, overallStatus: 'WON' },
          orderBy: { occurredAt: 'desc' },
          select: { id: true },
        });
        if (wonEvent) {
          await prisma.clientStageEvent.update({ where: { id: wonEvent.id }, data: { effectiveAt: saleDate } });
        }
      } catch (error) {
        console.warn('Data da venda não registrada no histórico de etapas:', error);
      }
    }

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

    const access = await checkClientAccess(user, params.id);
    if (access === 'not_found') return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    if (access === 'forbidden') return NextResponse.json({ error: "Você não tem acesso a este cliente." }, { status: 403 });

    const client = await getClientWithDetails(params.id);

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    // Documentos são exclusivos do administrador (corretores parceiros não veem).
    if (!user.isSuperAdmin) {
      return NextResponse.json({ client: { ...client, documents: [] } });
    }

    return NextResponse.json({ client });

  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}