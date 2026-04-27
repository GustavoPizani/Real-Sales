// app/api/funnels/route.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

function mapFunnel(f: any) {
  return {
    id: f.id,
    name: f.name,
    isDefaultEntry: f.isDefaultEntry,
    stages: (f.stages || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      color: s.color,
      funnelId: s.funnelId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  };
}

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const funnels = await prisma.funnel.findMany({
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(funnels.map(mapFunnel), {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar funis' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { name, isDefaultEntry = false } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do funil é obrigatório' }, { status: 400 });
    }

    const funnel = await prisma.funnel.create({
      data: {
        name: name.trim(),
        isDefaultEntry,
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json(mapFunnel(funnel), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um funil com esse nome. Escolha um nome diferente.' }, { status: 409 });
    }
    console.error('Erro ao criar funil:', error);
    return NextResponse.json({ error: 'Erro ao criar funil' }, { status: 500 });
  }
}
