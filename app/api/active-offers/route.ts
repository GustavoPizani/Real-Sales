// app/api/active-offers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, ActiveOfferSource, Prisma } from '@prisma/client';
import { buildLostClientWhere, parseMailingSpreadsheet } from '@/lib/active-offers';

export const dynamic = 'force-dynamic';

// GET: Lista as campanhas de Oferta Ativa (pool aberto — todo mundo da conta vê tudo)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const activeOffers = await prisma.activeOffer.findMany({
      where: {
        accountId: user.isSuperAdmin ? undefined : user.accountId,
        // Campanhas pausadas só aparecem pra administradores de marketing.
        status: user.role === Role.BROKER ? { not: 'PAUSED' } : undefined,
      },
      include: {
        createdBy: { select: { name: true } },
        _count: {
          select: { clients: { where: { status: 'PENDING' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(activeOffers);
  } catch (error) {
    console.error('Erro ao buscar ofertas ativas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Cria uma nova campanha de Oferta Ativa — de clientes internos perdidos ou upload de mailing
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Apenas administradores de marketing podem criar campanhas.' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      return await createFromMailingUpload(request, user);
    }
    return await createFromInternalClients(request, user);

  } catch (error: any) {
    console.error('Erro ao criar oferta ativa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 });
  }
}

async function createFromInternalClients(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getUserFromToken>>>) {
  const { name, source, propertyOfInterestId, brokerId } = await request.json();

  if (!name || !source) {
    return NextResponse.json({ error: 'Nome e fonte são obrigatórios.' }, { status: 400 });
  }

  const filterResult = await buildLostClientWhere(user, { source, propertyOfInterestId, brokerId });
  if ('error' in filterResult) {
    return NextResponse.json({ error: filterResult.error }, { status: filterResult.status });
  }
  const { where: clientWhereClause, defaultPropertyOfInterestId } = filterResult;

  const clientsToMove = await prisma.client.findMany({
    where: clientWhereClause,
    select: { id: true, fullName: true, email: true, phone: true },
  });

  if (clientsToMove.length === 0) {
    return NextResponse.json({ error: 'Nenhum cliente encontrado para os critérios selecionados.' }, { status: 404 });
  }

  const contactsToCreate: Prisma.ActiveOfferClientCreateManyActiveOfferInput[] = clientsToMove.map(client => ({
    clientId: client.id,
    fullName: client.fullName,
    email: client.email,
    phone: client.phone,
  }));

  const newOffer = await prisma.activeOffer.create({
    data: {
      name,
      source: ActiveOfferSource.INTERNAL_CLIENTS,
      accountId: user.accountId,
      createdById: user.id,
      defaultPropertyOfInterestId,
    },
  });

  // Nota: activeOfferClient.createMany() (aninhado ou não) falha com "column does not
  // exist" de forma espúria sobre a conexão pooled do pgbouncer nesse projeto. create()
  // individual funciona normalmente, então criamos um por um.
  await Promise.all(contactsToCreate.map(c =>
    prisma.activeOfferClient.create({ data: { ...c, activeOfferId: newOffer.id } })
  ));

  return NextResponse.json({ ...newOffer, _count: { clients: contactsToCreate.length } }, { status: 201 });
}

async function createFromMailingUpload(request: NextRequest, user: NonNullable<Awaited<ReturnType<typeof getUserFromToken>>>) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const file = formData.get('file') as File | null;
  const propertyOfInterestId = (formData.get('propertyOfInterestId') as string | null) || undefined;

  if (!name || !file) {
    return NextResponse.json({ error: 'Nome da campanha e arquivo são obrigatórios.' }, { status: 400 });
  }

  const parsed = await parseMailingSpreadsheet(file, user);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const { contactsToCreate, totalRows, linkedToExisting, skippedActive } = parsed;

  if (contactsToCreate.length === 0) {
    return NextResponse.json({
      error: 'Todos os contatos da planilha já estão ativos no CRM — nenhum foi adicionado.',
      totalRows,
      skippedActive,
    }, { status: 400 });
  }

  const newOffer = await prisma.activeOffer.create({
    data: {
      name,
      source: ActiveOfferSource.MAILING_UPLOAD,
      accountId: user.accountId,
      createdById: user.id,
      defaultPropertyOfInterestId: propertyOfInterestId,
    },
  });

  // Nota: activeOfferClient.createMany() (aninhado ou não) falha com "column does not
  // exist" de forma espúria sobre a conexão pooled do pgbouncer nesse projeto. create()
  // individual funciona normalmente, então criamos um por um.
  await Promise.all(contactsToCreate.map(c =>
    prisma.activeOfferClient.create({ data: { ...c, activeOfferId: newOffer.id } })
  ));

  return NextResponse.json({
    ...newOffer,
    _count: { clients: contactsToCreate.length },
    totalRows,
    linkedToExisting,
    skippedActive,
  }, { status: 201 });
}
