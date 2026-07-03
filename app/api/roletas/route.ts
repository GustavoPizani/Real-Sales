// app/api/roletas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// GET: Busca todas as roletas e os corretores associados
// ?status=active filtra apenas roletas ativas e dentro do período de validade (ou constantes, sem período definido)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const onlyActive = request.nextUrl.searchParams.get('status') === 'active';
    const now = new Date();

    const roletas = await prisma.leadRoulette.findMany({
      where: onlyActive
        ? {
            isActive: true,
            AND: [
              { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
              { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
            ],
          }
        : undefined,
      include: {
        funnel: { select: { id: true, name: true } },
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Conta quantos leads cada corretor recebeu através do funil desta roleta
    const leadCounts = await prisma.client.groupBy({
      by: ['brokerId', 'funnelId'],
      where: {
        funnelId: { in: roletas.map((r) => r.funnelId).filter((id): id is string => !!id) },
      },
      _count: { _all: true },
    });
    const leadCountKey = (brokerId: string, funnelId: string) => `${brokerId}::${funnelId}`;
    const leadCountMap = new Map(leadCounts.map((c) => [leadCountKey(c.brokerId, c.funnelId!), c._count._all]));

    // Formata os dados no formato que a tela espera
    const formattedRoletas = roletas.map((roleta) => ({
      id: roleta.id,
      name: roleta.name,
      ativa: roleta.isActive,
      validFrom: roleta.validFrom,
      validUntil: roleta.validUntil,
      last_assigned_index: roleta.lastAssignedIndex,
      funnelId: roleta.funnelId,
      funnel: roleta.funnel,
      createdAt: roleta.createdAt,
      usuarios: roleta.users.map((u) => ({
        id: u.user.id,
        name: u.user.name,
        email: u.user.email,
        role: u.user.role,
        lastAssignedAt: u.lastAssignedAt,
        leadCount: roleta.funnelId ? leadCountMap.get(leadCountKey(u.user.id, roleta.funnelId)) ?? 0 : 0,
      })),
    }));

    return NextResponse.json(formattedRoletas, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error: any) {
    console.error('Erro na API de Roletas:', error.message);
    return NextResponse.json({ error: 'Erro ao buscar roletas' }, { status: 500 });
  }
}

// POST: Cria uma nova roleta e associa os corretores
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, funnelId, userIds, usuarios, validFrom, validUntil } = body;
    const ids: string[] = userIds ?? usuarios ?? [];

    if (!name || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Nome e pelo menos um usuário são obrigatórios.' },
        { status: 400 }
      );
    }

    const newRoleta = await prisma.leadRoulette.create({
      data: {
        name,
        funnelId: funnelId || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        users: {
          create: ids.map((id: string) => ({ userId: id })),
        },
      },
    });

    return NextResponse.json(newRoleta);
  } catch (error: any) {
    console.error('Erro ao criar roleta:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
