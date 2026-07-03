// app/api/roletas/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function formatRoleta(roleta: any) {
  const leadCounts = roleta.funnelId
    ? await prisma.client.groupBy({
        by: ['brokerId'],
        where: { funnelId: roleta.funnelId, brokerId: { in: roleta.users.map((u: any) => u.user.id) } },
        _count: { _all: true },
      })
    : [];
  const leadCountMap = new Map(leadCounts.map((c) => [c.brokerId, c._count._all]));

  return {
    id: roleta.id,
    name: roleta.name,
    ativa: roleta.isActive,
    validFrom: roleta.validFrom,
    validUntil: roleta.validUntil,
    last_assigned_index: roleta.lastAssignedIndex,
    funnelId: roleta.funnelId,
    funnel: roleta.funnel,
    createdAt: roleta.createdAt,
    usuarios: roleta.users.map((u: any) => ({
      id: u.user.id,
      name: u.user.name,
      email: u.user.email,
      role: u.user.role,
      lastAssignedAt: u.lastAssignedAt,
      leadCount: leadCountMap.get(u.user.id) ?? 0,
    })),
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const roleta = await prisma.leadRoulette.findUnique({
      where: { id: params.id },
      include: {
        funnel: { select: { id: true, name: true } },
        users: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      },
    });

    if (!roleta) return NextResponse.json({ error: 'Roleta não encontrada' }, { status: 404 });

    return NextResponse.json(await formatRoleta(roleta));
  } catch (error) {
    console.error('Erro ao buscar roleta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT: Atualiza uma roleta
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, ativa, validFrom, validUntil, funnelId } = body;
    const ids: string[] = body.usuarios ?? body.userIds ?? [];

    const updatedRoleta = await prisma.$transaction(async (tx) => {
      const roleta = await tx.leadRoulette.update({
        where: { id: params.id },
        data: {
          name,
          isActive: ativa,
          ...(validFrom !== undefined ? { validFrom: validFrom ? new Date(validFrom) : null } : {}),
          ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
          funnelId: funnelId || null,
        },
      });

      if (Array.isArray(ids) && ids.length > 0) {
        await tx.leadRouletteUser.deleteMany({ where: { rouletteId: params.id } });
        await tx.leadRouletteUser.createMany({
          data: ids.map((userId: string) => ({ rouletteId: params.id, userId })),
        });
      }

      return tx.leadRoulette.findUnique({
        where: { id: params.id },
        include: {
          funnel: { select: { id: true, name: true } },
          users: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        },
      });
    });

    return NextResponse.json(await formatRoleta(updatedRoleta));
  } catch (error) {
    console.error('Erro ao atualizar roleta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Exclui uma roleta
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.leadRoulette.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Roleta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir roleta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
