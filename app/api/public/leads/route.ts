import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClientOverallStatus } from '@prisma/client';
import { notifyNewLead } from '@/lib/notifications';
import { findDuplicateClient, registerRecadastro, reopenLostClient } from '@/lib/lead-dedup';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message, propertyId, brokerId, roletaId } = body;

    if (!name || !email || !phone || !propertyId || (!brokerId && !roletaId)) {
      return NextResponse.json({ error: 'Dados incompletos para criar o lead.' }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return NextResponse.json({ error: 'Imóvel inválido.' }, { status: 404 });
    }

    const cleanedPhone = phone.replace(/\D/g, '');
    const formattedPhone = `+55${cleanedPhone}`;
    const source = `LP do imóvel: ${property.title}`;

    // Dedup — lead já cadastrado (mesmo e-mail ou telefone) não gera cliente novo.
    // Se ainda estiver ativo com corretor, trava nele (não disputa roleta) e só avisa.
    // Se estiver marcado como perdido, volta a disputar a distribuição normal abaixo.
    const duplicate = await findDuplicateClient(email, formattedPhone);
    if (duplicate && duplicate.overallStatus !== ClientOverallStatus.LOST) {
      await registerRecadastro(duplicate, source);
      return NextResponse.json({ success: true, client: duplicate }, { status: 200 });
    }

    // Determina o corretor: ou o link aponta direto pra alguém, ou distribui pela roleta.
    let resolvedBrokerId: string | null = null;
    let resolvedRoletaId: string | null = null;
    let roletaFunnelId: string | null = null;

    if (roletaId) {
      const roleta = await prisma.leadRoulette.findUnique({ where: { id: roletaId } });
      if (!roleta) {
        return NextResponse.json({ error: 'Roleta inválida.' }, { status: 404 });
      }

      const rouletteUsers = await prisma.leadRouletteUser.findMany({
        where: { rouletteId: roletaId },
        // nulls: 'first' — quem nunca recebeu lead entra primeiro na fila
        orderBy: { lastAssignedAt: { sort: 'asc', nulls: 'first' } },
      });
      const activeUser = rouletteUsers[0];
      if (!activeUser) {
        return NextResponse.json({ error: 'Roleta sem corretores cadastrados.' }, { status: 400 });
      }

      resolvedBrokerId = activeUser.userId;
      resolvedRoletaId = roletaId;
      roletaFunnelId = roleta.funnelId;

      await prisma.leadRouletteUser.update({
        where: { rouletteId_userId: { rouletteId: roletaId, userId: activeUser.userId } },
        data: { lastAssignedAt: new Date() },
      });
    } else {
      resolvedBrokerId = brokerId;
    }

    const broker = await prisma.user.findUnique({ where: { id: resolvedBrokerId! } });
    if (!broker) {
      return NextResponse.json({ error: 'Corretor inválido.' }, { status: 404 });
    }

    // Funil de entrada: usa o da roleta se definido, senão o funil de entrada padrão da conta.
    const funnel = roletaFunnelId
      ? await prisma.funnel.findUnique({ where: { id: roletaFunnelId }, include: { stages: { orderBy: { order: 'asc' }, take: 1 } } })
      : await prisma.funnel.findFirst({ where: { isDefaultEntry: true }, include: { stages: { orderBy: { order: 'asc' }, take: 1 } } });

    if (!funnel || !funnel.stages[0]) {
      return NextResponse.json({ error: 'Nenhum funil de entrada configurado.' }, { status: 500 });
    }

    // Admin raiz não tem accountId preenchido (o próprio id É a conta).
    const clientAccountId = broker.accountId ?? broker.id;

    if (duplicate) {
      // Lead perdido recadastrando — reabre o mesmo registro em vez de criar um novo.
      const reopened = await reopenLostClient(duplicate, {
        brokerId: resolvedBrokerId!,
        roletaId: resolvedRoletaId,
        funnelId: funnel.id,
        funnelStageId: funnel.stages[0].id,
        source,
      });
      return NextResponse.json({ success: true, client: reopened }, { status: 200 });
    }

    const newClient = await prisma.client.create({
      data: {
        fullName: name,
        email,
        phone: formattedPhone,
        overallStatus: ClientOverallStatus.ACTIVE,
        brokerId: resolvedBrokerId!,
        createdById: resolvedBrokerId!,
        accountId: clientAccountId,
        roletaId: resolvedRoletaId,
        propertyOfInterestId: propertyId,
        funnelId: funnel.id,
        funnelStageId: funnel.stages[0].id,
        campaignSource: source,
        notes: {
          create: [
            {
              content: `Lead recebido através da página pública do imóvel: ${property.title}. Mensagem: ${message || 'Nenhuma'}`,
              authorId: resolvedBrokerId!,
            },
          ],
        },
      },
    });

    notifyNewLead({
      clientId: newClient.id,
      clientName: name,
      brokerId: resolvedBrokerId!,
      brokerName: broker.name,
      campaignSource: source,
      accountId: clientAccountId,
    }).catch(() => null);

    return NextResponse.json({ success: true, client: newClient }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar novo lead:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'Um cliente com este e-mail já existe.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao criar lead.' }, { status: 500 });
  }
}
