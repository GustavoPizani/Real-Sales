// app/api/active-offers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ActiveOfferClientStatus } from '@prisma/client';

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
