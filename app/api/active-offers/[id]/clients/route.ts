// app/api/active-offers/[id]/clients/route.ts
// Adiciona mais contatos a uma campanha de Oferta Ativa já existente — roda o mesmo
// filtro da criação (fonte Clientes Internos) ou aceita outra planilha (Mailing Externo).
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role, ActiveOfferSource } from "@prisma/client";
import { buildLostClientWhere, parseMailingSpreadsheet } from '@/lib/active-offers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: "Apenas administradores de marketing podem editar campanhas." }, { status: 403 });
    }

    const activeOffer = await prisma.activeOffer.findUnique({
      where: { id: params.id },
      select: { id: true, source: true },
    });
    if (!activeOffer) {
      return NextResponse.json({ error: "Oferta ativa não encontrada." }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      if (activeOffer.source !== ActiveOfferSource.MAILING_UPLOAD) {
        return NextResponse.json({ error: "Essa campanha não é de mailing externo." }, { status: 400 });
      }
      return await addFromMailingUpload(request, user, activeOffer.id);
    }

    if (activeOffer.source !== ActiveOfferSource.INTERNAL_CLIENTS) {
      return NextResponse.json({ error: "Essa campanha não é de clientes internos." }, { status: 400 });
    }
    return await addFromInternalClients(request, user, activeOffer.id);

  } catch (error) {
    console.error("Erro ao adicionar clientes à oferta ativa:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

async function addFromInternalClients(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getUserFromToken>>>, activeOfferId: string) {
  const { source, propertyOfInterestId, brokerId } = await request.json();
  if (!source) {
    return NextResponse.json({ error: "Fonte é obrigatória." }, { status: 400 });
  }

  const filterResult = await buildLostClientWhere(user, { source, propertyOfInterestId, brokerId });
  if ('error' in filterResult) {
    return NextResponse.json({ error: filterResult.error }, { status: filterResult.status });
  }

  const matchingClients = await prisma.client.findMany({
    where: filterResult.where,
    select: { id: true, fullName: true, email: true, phone: true },
  });

  if (matchingClients.length === 0) {
    return NextResponse.json(
      { error: "Nenhum cliente encontrado para os critérios selecionados.", addedCount: 0, alreadyLinkedCount: 0 },
      { status: 404 }
    );
  }

  const existingLinks = await prisma.activeOfferClient.findMany({
    where: { activeOfferId, clientId: { in: matchingClients.map(c => c.id) } },
    select: { clientId: true },
  });
  const existingClientIds = new Set(existingLinks.map(l => l.clientId));
  const toCreate = matchingClients.filter(c => !existingClientIds.has(c.id));

  // Nota: activeOfferClient.createMany() falha com "column does not exist" de forma
  // espúria sobre a conexão pooled do pgbouncer nesse projeto — create() individual
  // funciona normalmente.
  await Promise.all(toCreate.map(c =>
    prisma.activeOfferClient.create({
      data: { activeOfferId, clientId: c.id, fullName: c.fullName, email: c.email, phone: c.phone },
    })
  ));

  return NextResponse.json({ addedCount: toCreate.length, alreadyLinkedCount: matchingClients.length - toCreate.length });
}

async function addFromMailingUpload(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getUserFromToken>>>, activeOfferId: string) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: "Arquivo é obrigatório." }, { status: 400 });
  }

  const parsed = await parseMailingSpreadsheet(file, user);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  // Não duplica contatos já vinculados a um mesmo Client existente nessa campanha
  // (contatos sem clientId, avulsos, sempre entram — não tem como saber que já existem).
  const clientIds = parsed.contactsToCreate.map(c => c.clientId).filter((id): id is string => !!id);
  const existingLinks = clientIds.length
    ? await prisma.activeOfferClient.findMany({
        where: { activeOfferId, clientId: { in: clientIds } },
        select: { clientId: true },
      })
    : [];
  const existingClientIds = new Set(existingLinks.map(l => l.clientId));
  const toCreate = parsed.contactsToCreate.filter(c => !c.clientId || !existingClientIds.has(c.clientId));
  const alreadyLinkedCount = parsed.contactsToCreate.length - toCreate.length;

  await Promise.all(toCreate.map(c =>
    prisma.activeOfferClient.create({ data: { ...c, activeOfferId } })
  ));

  return NextResponse.json({
    addedCount: toCreate.length,
    alreadyLinkedCount,
    totalRows: parsed.totalRows,
    linkedToExisting: parsed.linkedToExisting,
    skippedActive: parsed.skippedActive,
  });
}
