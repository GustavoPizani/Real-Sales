// app/api/active-offers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, ClientOverallStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET: Lista as campanhas de Oferta Ativa
export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('authToken')?.value;
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
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, source, assignedToIds } = await request.json();

    if (!name || !source || !assignedToIds || assignedToIds.length === 0) {
      return NextResponse.json({ error: 'Nome, fonte e corretores atribuídos são obrigatórios.' }, { status: 400 });
    }

    let clientWhereClause: any = {
      overallStatus: { in: [ClientOverallStatus.Perdido] } // Base de clientes
    };

    // Lógica de permissão para buscar clientes
    if (source === 'meus_clientes') {
      clientWhereClause.corretorId = user.id;
    } else if (source === 'equipe' && (user.role === Role.gerente || user.role === Role.diretor)) {
      const subordinateIds = (await prisma.usuario.findMany({
        where: { superiorId: user.id },
        select: { id: true },
      })).map(u => u.id);
      clientWhereClause.corretorId = { in: [user.id, ...subordinateIds] };
    } else if (source === 'sem_corretor' && (user.role === Role.gerente || user.role === Role.diretor)) {
      clientWhereClause.corretorId = null;
    } else if (user.role !== Role.diretor && user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Permissão negada para esta fonte de clientes.' }, { status: 403 });
    }

    const clientsToContact = await prisma.cliente.findMany({
      where: clientWhereClause,
      select: { id: true },
    });

    if (clientsToContact.length === 0) {
      return NextResponse.json({ error: 'Nenhum cliente encontrado para os critérios selecionados.' }, { status: 404 });
    }

    const newActiveOffer = await prisma.activeOffer.create({
      data: {
        name,
        createdById: user.id,
        clients: {
          create: clientsToContact.flatMap(client =>
            assignedToIds.map((brokerId: string) => ({
              clienteId: client.id,
              assignedToId: brokerId,
            }))
          ),
        },
      },
      include: {
        _count: {
          select: { clients: true },
        },
      },
    });

    return NextResponse.json(newActiveOffer, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar oferta ativa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

