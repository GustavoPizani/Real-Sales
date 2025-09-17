// app/api/active-offers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Retorna os detalhes de uma campanha de Oferta Ativa
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
 
    const { id } = params;
 
    const activeOffer = await prisma.activeOffer.findUnique({
      where: { id },
      include: {
        clients: {
          where: {
            // O corretor só vê os clientes atribuídos a ele nesta campanha
            assignedToId: user.role === 'corretor' ? user.id : undefined,
          },
          include: {
            cliente: {
              select: {
                nomeCompleto: true,
                telefone: true,
                email: true,
                notas: { orderBy: { createdAt: 'desc' }, take: 3 },
              },
            },
          },
          orderBy: { status: 'asc' },
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
