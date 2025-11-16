// app/api/active-offers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, ClientOverallStatus, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// GET: Lista as campanhas de Oferta Ativa
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let whereClause: any = {};

    if (user.role === Role.corretor) {
      // Corretores veem apenas as campanhas atribuídas a eles
      whereClause = {
        clients: {
          some: { assignedToId: user.id },
        },
      };
    } else if (user.role === Role.gerente) {
      // Gerentes veem campanhas que eles criaram ou que foram atribuídas à sua equipe
      const subordinateIds = (await prisma.usuario.findMany({
        where: { superiorId: user.id },
        select: { id: true },
      })).map(u => u.id);

      whereClause = {
        OR: [
          { createdById: user.id },
          { clients: { some: { assignedToId: { in: [user.id, ...subordinateIds] } } } },
        ],
      };
    }
    // Diretores e Admins veem tudo

    const activeOffers = await prisma.activeOffer.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { nome: true } },
        _count: {
          select: { clients: true },
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

// POST: Cria uma nova campanha de Oferta Ativa
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let newActiveOffer;

    if (contentType.includes('multipart/form-data')) {
        // --- Criação a partir de LISTA ---
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const file = formData.get('file') as File | null;
        const assignedToIds = formData.getAll('assignedToIds') as string[];

        if (!name || !file || assignedToIds.length === 0) {
            return NextResponse.json({ error: 'Nome, arquivo e corretores atribuídos são obrigatórios.' }, { status: 400 });
        }

        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        const contacts: Prisma.ActiveOfferClientCreateManyOfferInput[] = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Pula o cabeçalho
                const contactName = row.getCell(1).value?.toString();
                if (contactName) {
                    const contactEmail = row.getCell(2).value?.toString();
                    const contactPhone = row.getCell(3).value?.toString();
                    assignedToIds.forEach(brokerId => {
                        contacts.push({
                            assignedToId: brokerId,
                            contactName,
                            contactEmail,
                            contactPhone,
                        });
                    });
                }
            }
        });

        if (contacts.length === 0) {
            return NextResponse.json({ error: 'A planilha não contém contatos válidos.' }, { status: 400 });
        }

        newActiveOffer = await prisma.activeOffer.create({
            data: {
                name,
                createdById: user.id,
                clients: { createMany: { data: contacts } },
            },
        });

    } else {
        // --- Criação a partir do SISTEMA ---
        const { name, source, assignedToIds } = await request.json();

        if (!name || !source || !assignedToIds || !assignedToIds.length) {
            return NextResponse.json({ error: 'Nome, fonte e corretores atribuídos são obrigatórios.' }, { status: 400 });
        }

        let clientWhereClause: Prisma.ClienteWhereInput = {
            overallStatus: ClientOverallStatus.Perdido
        };

        if (source === 'meus_clientes') {
            clientWhereClause.proprietarioId = user.id;
        } else if (source === 'equipe' && [Role.gerente, Role.diretor, Role.marketing_adm].includes(user.role)) {
            const subordinateIds = (await prisma.usuario.findMany({ where: { superiorId: user.id }, select: { id: true } })).map(u => u.id);
            clientWhereClause.proprietarioId = { in: [user.id, ...subordinateIds] };
        } else if (source === 'sem_proprietario' && [Role.diretor, Role.marketing_adm].includes(user.role)) {
            clientWhereClause.proprietarioId = null;
        } else {
            return NextResponse.json({ error: 'Permissão negada para esta fonte de clientes.' }, { status: 403 });
        }

        const clientsToMove = await prisma.cliente.findMany({
            where: clientWhereClause,
            select: { id: true, nomeCompleto: true, email: true, telefone: true },
        });

        if (clientsToMove.length === 0) {
            return NextResponse.json({ error: 'Nenhum cliente encontrado para os critérios selecionados.' }, { status: 404 });
        }

        const contactsToCreate: Prisma.ActiveOfferClientCreateManyOfferInput[] = clientsToMove.flatMap(client =>
            assignedToIds.map((brokerId: string) => ({
                assignedToId: brokerId,
                contactName: client.nomeCompleto,
                contactEmail: client.email,
                contactPhone: client.telefone,
                originalClienteId: client.id, // Rastreia a origem
            }))
        );

        newActiveOffer = await prisma.activeOffer.create({
            data: {
                name,
                createdById: user.id,
                clients: { createMany: { data: contactsToCreate } },
            },
        });
    }

    // Retorna a contagem após a criação
    const finalOffer = await prisma.activeOffer.findUnique({
        where: { id: newActiveOffer.id },
        include: {
            _count: { select: { clients: true } },
        },
    });

    return NextResponse.json(finalOffer, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar oferta ativa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
