// app/api/active-offers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, ClientOverallStatus, ActiveOfferSource, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// GET: Lista as campanhas de Oferta Ativa (pool aberto — todo mundo da conta vê tudo)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const activeOffers = await prisma.activeOffer.findMany({
      where: { accountId: user.isSuperAdmin ? undefined : user.accountId },
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

  const clientWhereClause: Prisma.ClientWhereInput = {
    overallStatus: ClientOverallStatus.LOST,
    accountId: user.isSuperAdmin ? undefined : user.accountId,
  };

  if (source === 'meus_clientes') {
    clientWhereClause.brokerId = user.id;
  } else if (source === 'equipe' && user.role === Role.MARKETING_ADMIN) {
    const subordinateIds = (await prisma.user.findMany({ where: { supervisorId: user.id }, select: { id: true } })).map(u => u.id);
    const allowedBrokerIds = [user.id, ...subordinateIds];

    if (brokerId) {
      if (!allowedBrokerIds.includes(brokerId)) {
        return NextResponse.json({ error: 'Esse corretor não está na sua equipe.' }, { status: 403 });
      }
      clientWhereClause.brokerId = brokerId;
    } else {
      clientWhereClause.brokerId = { in: allowedBrokerIds };
    }
  } else {
    return NextResponse.json({ error: 'Permissão negada para esta fonte de clientes.' }, { status: 403 });
  }

  if (propertyOfInterestId === 'NONE') {
    clientWhereClause.propertyOfInterestId = null;
  } else if (propertyOfInterestId) {
    clientWhereClause.propertyOfInterestId = propertyOfInterestId;
  }

  // Quando o filtro é um imóvel específico, ele também vira o padrão sugerido
  // na hora de classificar os contatos dessa campanha como "interessado".
  const defaultPropertyOfInterestId = propertyOfInterestId && propertyOfInterestId !== 'NONE' ? propertyOfInterestId : undefined;

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

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return NextResponse.json({ error: 'A planilha está vazia ou corrompida.' }, { status: 400 });
  }

  const headerRow = worksheet.getRow(1).values as any[];
  if (headerRow[0] === null || headerRow[0] === undefined) headerRow.shift();
  const normalizedHeaders = headerRow.map(h => String(h ?? '').trim().toLowerCase());
  const nameIdx = normalizedHeaders.findIndex(h => h.includes('nome'));
  const emailIdx = normalizedHeaders.findIndex(h => h.includes('email'));
  const phoneIdx = normalizedHeaders.findIndex(h => h.includes('telefone') || h.includes('phone') || h.includes('celular'));

  if (nameIdx === -1) {
    return NextResponse.json({ error: 'A planilha precisa de uma coluna "Nome".' }, { status: 400 });
  }

  type ParsedRow = { fullName: string; email: string | null; phone: string | null };
  const parsedRows: ParsedRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as any[];
    if (values[0] === null || values[0] === undefined) values.shift();

    const fullName = values[nameIdx]?.toString().trim();
    if (!fullName) return;

    const email = emailIdx !== -1 ? (values[emailIdx]?.toString().trim() || null) : null;
    const phone = phoneIdx !== -1 ? (values[phoneIdx]?.toString().trim() || null) : null;
    parsedRows.push({ fullName, email, phone });
  });

  if (parsedRows.length === 0) {
    return NextResponse.json({ error: 'Nenhum contato válido encontrado na planilha.' }, { status: 400 });
  }

  const tenantWhere: Prisma.ClientWhereInput = { accountId: user.isSuperAdmin ? undefined : user.accountId };
  const emails = parsedRows.map(r => r.email).filter((e): e is string => !!e);
  const phones = parsedRows.map(r => r.phone).filter((p): p is string => !!p);

  const matchingClients = (emails.length || phones.length)
    ? await prisma.client.findMany({
        where: {
          ...tenantWhere,
          OR: [
            ...(emails.length ? [{ email: { in: emails } }] : []),
            ...(phones.length ? [{ phone: { in: phones } }] : []),
          ],
        },
        select: { id: true, email: true, phone: true, overallStatus: true },
      })
    : [];

  const clientByEmail = new Map(matchingClients.filter(c => c.email).map(c => [c.email as string, c]));
  const clientByPhone = new Map(matchingClients.filter(c => c.phone).map(c => [c.phone as string, c]));

  let skippedActive = 0;
  let linkedToExisting = 0;
  const usedClientIds = new Set<string>();
  const contactsToCreate: Prisma.ActiveOfferClientCreateManyActiveOfferInput[] = [];

  for (const row of parsedRows) {
    let matched = (row.email && clientByEmail.get(row.email)) || (row.phone && clientByPhone.get(row.phone)) || null;

    if (matched && matched.overallStatus === ClientOverallStatus.ACTIVE) {
      skippedActive++;
      continue;
    }

    if (matched && usedClientIds.has(matched.id)) {
      matched = null;
    } else if (matched) {
      usedClientIds.add(matched.id);
    }

    if (matched) linkedToExisting++;

    contactsToCreate.push({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      clientId: matched ? matched.id : undefined,
    });
  }

  if (contactsToCreate.length === 0) {
    return NextResponse.json({
      error: 'Todos os contatos da planilha já estão ativos no CRM — nenhum foi adicionado.',
      totalRows: parsedRows.length,
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
    totalRows: parsedRows.length,
    linkedToExisting,
    skippedActive,
  }, { status: 201 });
}
