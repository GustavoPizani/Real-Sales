// lib/active-offers.ts
// Compartilhado entre criação de campanha e "adicionar mais clientes" a uma campanha existente.
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, ClientOverallStatus, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';

type User = NonNullable<Awaited<ReturnType<typeof getUserFromToken>>>;

export type InternalClientFilter = {
  source: string;
  propertyOfInterestId?: string;
  brokerId?: string;
};

export async function buildLostClientWhere(
  user: User,
  { source, propertyOfInterestId, brokerId }: InternalClientFilter
): Promise<{ where: Prisma.ClientWhereInput; defaultPropertyOfInterestId?: string } | { error: string; status: number }> {
  const where: Prisma.ClientWhereInput = {
    overallStatus: ClientOverallStatus.LOST,
    accountId: user.isSuperAdmin ? undefined : user.accountId,
  };

  if (source === 'meus_clientes') {
    where.brokerId = user.id;
  } else if (source === 'equipe' && user.role === Role.MARKETING_ADMIN) {
    const subordinateIds = (await prisma.user.findMany({ where: { supervisorId: user.id }, select: { id: true } })).map(u => u.id);
    const allowedBrokerIds = [user.id, ...subordinateIds];

    if (brokerId) {
      if (!allowedBrokerIds.includes(brokerId)) {
        return { error: 'Esse corretor não está na sua equipe.', status: 403 };
      }
      where.brokerId = brokerId;
    } else {
      where.brokerId = { in: allowedBrokerIds };
    }
  } else {
    return { error: 'Permissão negada para esta fonte de clientes.', status: 403 };
  }

  if (propertyOfInterestId === 'NONE') {
    where.propertyOfInterestId = null;
  } else if (propertyOfInterestId) {
    where.propertyOfInterestId = propertyOfInterestId;
  }

  const defaultPropertyOfInterestId = propertyOfInterestId && propertyOfInterestId !== 'NONE' ? propertyOfInterestId : undefined;

  return { where, defaultPropertyOfInterestId };
}

type ParsedMailingContacts = {
  contactsToCreate: { fullName: string; email: string | null; phone: string | null; clientId?: string }[];
  totalRows: number;
  linkedToExisting: number;
  skippedActive: number;
};

// Lê uma planilha (.xlsx) de mailing externo e cruza email/telefone com clientes já
// existentes: cliente ativo pula a linha, cliente inativo/perdido vincula o clientId,
// sem match vira contato solto (sem clientId).
export async function parseMailingSpreadsheet(
  file: File,
  user: User
): Promise<ParsedMailingContacts | { error: string; status: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { error: 'A planilha está vazia ou corrompida.', status: 400 };
  }

  const headerRow = worksheet.getRow(1).values as any[];
  if (headerRow[0] === null || headerRow[0] === undefined) headerRow.shift();
  const normalizedHeaders = headerRow.map(h => String(h ?? '').trim().toLowerCase());
  const nameIdx = normalizedHeaders.findIndex(h => h.includes('nome'));
  const emailIdx = normalizedHeaders.findIndex(h => h.includes('email'));
  const phoneIdx = normalizedHeaders.findIndex(h => h.includes('telefone') || h.includes('phone') || h.includes('celular'));

  if (nameIdx === -1) {
    return { error: 'A planilha precisa de uma coluna "Nome".', status: 400 };
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
    return { error: 'Nenhum contato válido encontrado na planilha.', status: 400 };
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
  const contactsToCreate: ParsedMailingContacts['contactsToCreate'] = [];

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

  return { contactsToCreate, totalRows: parsedRows.length, linkedToExisting, skippedActive };
}
