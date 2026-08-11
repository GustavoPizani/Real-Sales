// app/api/active-offers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ActiveOfferClientStatus, ActiveOfferStatus, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET: Retorna os detalhes de uma campanha de Oferta Ativa
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;

    const activeOffer = await prisma.activeOffer.findUnique({
      where: { id },
      include: {
        clients: {
          // Pool aberto — qualquer usuário da conta vê e classifica.
          where: {
            status: ActiveOfferClientStatus.PENDING,
            OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }],
          },
          include: {
            // Histórico só existe quando o contato já é um Client vinculado.
            client: {
              select: {
                notes: { orderBy: { createdAt: 'desc' }, take: 3, select: { content: true, createdAt: true } },
              },
            },
          },
          // Nunca contatado primeiro; quem já foi tentado vai pro fim da fila.
          orderBy: { contactedAt: { sort: 'asc', nulls: 'first' } },
        },
      },
    });
 
    if (!activeOffer) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }
 
    return NextResponse.json(activeOffer);
  } catch (error) {
    console.error('Erro ao buscar detalhes da oferta ativa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH: Pausa/reativa uma campanha de Oferta Ativa
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Apenas administradores de marketing podem alterar campanhas.' }, { status: 403 });
    }

    const { status } = await request.json();
    if (status !== ActiveOfferStatus.PAUSED && status !== ActiveOfferStatus.PENDING) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const updated = await prisma.activeOffer.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar status da oferta ativa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Exclui uma campanha de Oferta Ativa (não afeta os Clients já existentes)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Apenas administradores de marketing podem excluir campanhas.' }, { status: 403 });
    }

    await prisma.activeOffer.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir oferta ativa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
