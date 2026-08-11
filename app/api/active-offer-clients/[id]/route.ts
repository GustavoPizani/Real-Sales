// app/api/active-offer-clients/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ActiveOfferClientStatus, ClientOverallStatus, DiscardReason, QualificationStatus } from '@prisma/client';
import { z } from 'zod';
import { outcomeSchema, snoozeUntilDate } from '@/lib/call-queue';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  outcome: outcomeSchema,
  comment: z.string().optional(),
  propertyOfInterestId: z.string().optional(),
});

// PUT: Classifica o resultado de um contato de Oferta Ativa (fonte interna ou mailing)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido', details: parsed.error.flatten() }, { status: 400 });
    }
    const { outcome, comment, propertyOfInterestId } = parsed.data;

    const offerClient = await prisma.activeOfferClient.findUnique({
      where: { id: params.id },
      include: { activeOffer: { select: { name: true, accountId: true, defaultPropertyOfInterestId: true } } },
    });

    if (!offerClient) {
      return NextResponse.json({ error: 'Contato da oferta não encontrado.' }, { status: 404 });
    }

    if (!user.isSuperAdmin && offerClient.activeOffer.accountId !== user.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    if (outcome === 'INTERESTED') {
      // Se o corretor não escolheu um imóvel na hora, cai no padrão da campanha (se houver).
      const resolvedPropertyId = propertyOfInterestId || offerClient.activeOffer.defaultPropertyOfInterestId || undefined;

      const client = await prisma.$transaction(async (tx) => {
        let clientRecord;

        if (offerClient.clientId) {
          clientRecord = await tx.client.update({
            where: { id: offerClient.clientId },
            data: {
              overallStatus: ClientOverallStatus.ACTIVE,
              brokerId: user.id,
              ...(resolvedPropertyId ? { propertyOfInterestId: resolvedPropertyId } : {}),
            },
          });
        } else {
          const defaultFunnel = await tx.funnel.findFirst({
            where: { isDefaultEntry: true },
            include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
          });
          const firstStage = defaultFunnel?.stages[0];
          if (!defaultFunnel || !firstStage) {
            throw new Error('Nenhum funil padrão configurado para receber novos leads.');
          }

          clientRecord = await tx.client.create({
            data: {
              fullName: offerClient.fullName,
              email: offerClient.email,
              phone: offerClient.phone,
              overallStatus: ClientOverallStatus.ACTIVE,
              qualificationStatus: QualificationStatus.ASSIGNED,
              campaignSource: `Oferta Ativa: ${offerClient.activeOffer.name}`,
              brokerId: user.id,
              createdById: user.id,
              accountId: user.accountId,
              funnelId: defaultFunnel.id,
              funnelStageId: firstStage.id,
              propertyOfInterestId: resolvedPropertyId,
            },
          });
        }

        if (comment) {
          await tx.note.create({
            data: { content: comment, authorId: user.id, authorName: user.name, clientId: clientRecord.id },
          });
        }

        await tx.activeOfferClient.update({
          where: { id: params.id },
          data: {
            status: ActiveOfferClientStatus.CONTACTED,
            notes: comment,
            contactedAt: new Date(),
            clientId: clientRecord.id,
            claimedById: user.id,
            claimedAt: new Date(),
          },
        });

        return clientRecord;
      });
      return NextResponse.json({ client });
    }

    if (outcome === 'NO_ANSWER') {
      // Continua PENDING — só atualiza a data da tentativa, o que naturalmente
      // manda o contato pro fim da fila (ordenada por contactedAt asc/nulls first).
      const updated = await prisma.activeOfferClient.update({
        where: { id: params.id },
        data: { status: ActiveOfferClientStatus.PENDING, notes: comment, contactedAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    if (outcome === 'SNOOZE') {
      const updated = await prisma.activeOfferClient.update({
        where: { id: params.id },
        data: { notes: comment, snoozedUntil: snoozeUntilDate() },
      });
      return NextResponse.json(updated);
    }

    // NOT_INTERESTED | NOT_A_CLIENT
    const updated = await prisma.activeOfferClient.update({
      where: { id: params.id },
      data: {
        status: ActiveOfferClientStatus.DISCARDED,
        discardReason: outcome === 'NOT_INTERESTED' ? DiscardReason.NOT_INTERESTED : DiscardReason.NOT_A_CLIENT,
        notes: comment,
      },
    });
    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('Erro ao classificar contato da oferta ativa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 });
  }
}
