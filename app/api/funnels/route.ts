// app/api/funnels/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const funnels = await prisma.funnel.findMany({
      include: {
        stages: { // Mudou de 'etapas' para 'stages' no Prisma
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mapeia os dados para o formato esperado pelo frontend, usando nomes de campo em inglês.
    const formattedFunnels = funnels.map(f => ({
      id: f.id,
      name: f.name,
      isPreSales: f.isPreSales,
      isDefaultEntry: f.isDefaultEntry,
      stages: f.stages.map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        color: s.color
      }))
    }));

    return NextResponse.json(formattedFunnels);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar funis' }, { status: 500 });
  }
}