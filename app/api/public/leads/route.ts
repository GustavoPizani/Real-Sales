import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClientOverallStatus, Role } from '@prisma/client';
import { notifyNewLead } from '@/lib/notifications';
import { findDuplicateClient, registerRecadastro, reopenLostClient } from '@/lib/lead-dedup';
import { claimNextRouletteUser, resolveLeadLink } from '@/lib/public-lead-link';

const firstStage = { stages: { orderBy: { order: 'asc' as const }, take: 1 } };

/**
 * Cadastro vindo da página pública do imóvel.
 *
 * A resposta vai para um visitante anônimo: nunca devolve dados de cliente.
 * Devolve só os preços das tipologias, que a página libera depois do cadastro.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message, propertyId, brokerId, roletaId, funnelId, website } = body;

    const property = typeof propertyId === 'string'
      ? await prisma.property.findUnique({
          where: { id: propertyId },
          select: { id: true, title: true, propertyTypes: { select: { id: true, value: true } } },
        })
      : null;
    if (!property) {
      return NextResponse.json({ error: 'Imóvel inválido.' }, { status: 404 });
    }
    const unlocked = { success: true, prices: property.propertyTypes };

    // Campo-isca: fica escondido no formulário e só robôs preenchem. Responde
    // como se tivesse dado certo, sem criar nada.
    if (typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ success: true, prices: [] }, { status: 200 });
    }

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
    if (!cleanName || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Informe nome e telefone.' }, { status: 400 });
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    // Só dígitos. Se a pessoa já digitou o 55 do país (12 ou 13 dígitos), não repete.
    const digits = phone.replace(/\D/g, '');
    const cleanedPhone = digits.length >= 12 && digits.startsWith('55') ? digits.slice(2) : digits;
    if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
      return NextResponse.json({ error: 'Telefone inválido. Informe o DDD e o número.' }, { status: 400 });
    }
    const formattedPhone = `+55${cleanedPhone}`;
    const source = `LP do imóvel: ${property.title}`;
    const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 2000) : '';

    // O link precisa apontar para um corretor ou uma roleta válidos.
    const link = await resolveLeadLink(brokerId, roletaId);
    if (!link.ok) {
      return NextResponse.json({ error: 'Este link não está mais disponível. Peça um novo ao seu corretor.', code: 'invalid_link' }, { status: 400 });
    }

    // Dedup — lead já cadastrado (mesmo e-mail ou telefone) não gera cliente novo.
    // Em andamento ou já comprou: fica com o corretor atual (não disputa roleta) e só avisa.
    // Marcado como perdido: volta a disputar a distribuição normal abaixo.
    const duplicate = await findDuplicateClient(cleanEmail, formattedPhone);
    if (duplicate && duplicate.overallStatus !== ClientOverallStatus.LOST) {
      await registerRecadastro(duplicate, source, cleanMessage);
      return NextResponse.json(unlocked, { status: 200 });
    }

    // Corretor: o do link, ou o próximo da roleta.
    let resolvedBrokerId: string | null;
    let resolvedRoletaId: string | null = null;
    let roletaFunnelId: string | null = null;

    if (link.mode === 'roleta') {
      resolvedBrokerId = await claimNextRouletteUser(link.roleta.id);
      if (!resolvedBrokerId) {
        return NextResponse.json({ error: 'Não foi possível distribuir o contato agora. Tente novamente.' }, { status: 503 });
      }
      resolvedRoletaId = link.roleta.id;
      roletaFunnelId = link.roleta.funnelId;
    } else {
      resolvedBrokerId = link.broker.id;
    }

    const broker = await prisma.user.findUnique({
      where: { id: resolvedBrokerId },
      select: { id: true, name: true, accountId: true, role: true },
    });
    if (!broker) {
      return NextResponse.json({ error: 'Corretor inválido.' }, { status: 404 });
    }

    // Funil de entrada, nesta ordem: o escolhido ao gerar o link (funnelId), o da
    // roleta, o de entrada padrão e, na falta de todos, o primeiro funil que existir.
    // Um funnelId que não existe mais é ignorado em vez de derrubar o cadastro.
    let funnel =
      (typeof funnelId === 'string' && funnelId
        ? await prisma.funnel.findUnique({ where: { id: funnelId }, include: firstStage })
        : null) ??
      (roletaFunnelId ? await prisma.funnel.findUnique({ where: { id: roletaFunnelId }, include: firstStage }) : null) ??
      (await prisma.funnel.findFirst({ where: { isDefaultEntry: true }, include: firstStage })) ??
      (await prisma.funnel.findFirst({ orderBy: { name: 'asc' }, include: firstStage }));

    // Corretor só enxerga os funis liberados para ele. Se o funil escolhido não é
    // um deles, o lead ficaria invisível no pipeline: entra num funil que ele vê.
    let funnelAdjustment = '';
    if (funnel && broker.role !== Role.MARKETING_ADMIN) {
      const access = await prisma.userFunnelAccess.findMany({ where: { userId: broker.id }, select: { funnelId: true } });
      const visibleIds = access.map(a => a.funnelId);
      if (visibleIds.length > 0 && !visibleIds.includes(funnel.id)) {
        const visible = await prisma.funnel.findFirst({
          where: { id: { in: visibleIds } },
          orderBy: [{ isDefaultEntry: 'desc' }, { name: 'asc' }],
          include: firstStage,
        });
        if (visible?.stages[0]) {
          funnelAdjustment = ` O link apontava para o funil "${funnel.name}", ao qual ${broker.name} não tem acesso; o lead entrou em "${visible.name}".`;
          funnel = visible;
        }
      }
    }

    if (!funnel || !funnel.stages[0]) {
      return NextResponse.json({ error: 'Nenhum funil de entrada configurado.' }, { status: 500 });
    }

    // Admin raiz não tem accountId preenchido (o próprio id É a conta).
    const clientAccountId = broker.accountId ?? broker.id;

    if (duplicate) {
      // Lead perdido recadastrando — reabre o mesmo registro em vez de criar um novo.
      await reopenLostClient(duplicate, {
        brokerId: broker.id,
        roletaId: resolvedRoletaId,
        funnelId: funnel.id,
        funnelStageId: funnel.stages[0].id,
        source,
      });
      return NextResponse.json(unlocked, { status: 200 });
    }

    const newClient = await prisma.client.create({
      data: {
        fullName: cleanName,
        email: cleanEmail,
        phone: formattedPhone,
        overallStatus: ClientOverallStatus.ACTIVE,
        brokerId: broker.id,
        createdById: broker.id,
        accountId: clientAccountId,
        roletaId: resolvedRoletaId,
        propertyOfInterestId: property.id,
        funnelId: funnel.id,
        funnelStageId: funnel.stages[0].id,
        campaignSource: source,
        notes: {
          create: [
            {
              content: `Lead recebido através da página pública do imóvel: ${property.title}. Mensagem: ${cleanMessage || 'Nenhuma'}.${funnelAdjustment}`,
              authorId: broker.id,
            },
          ],
        },
      },
      select: { id: true },
    });

    notifyNewLead({
      clientId: newClient.id,
      clientName: cleanName,
      brokerId: broker.id,
      brokerName: broker.name,
      campaignSource: source,
      accountId: clientAccountId,
    }).catch(() => null);

    return NextResponse.json(unlocked, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar novo lead:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'Um cliente com este e-mail já existe.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao criar lead.' }, { status: 500 });
  }
}
