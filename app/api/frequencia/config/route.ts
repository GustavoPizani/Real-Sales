import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET: Retorna todas as configurações de frequência (marketing_adm)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const configs = await prisma.frequenciaConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Erro ao buscar configurações de frequência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Cria uma nova configuração de frequência (marketing_adm)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { nome, latitude, longitude, raio, horarios, diasDaSemana, ativo } = await request.json();

    if (!nome || latitude === undefined || longitude === undefined || raio === undefined || !horarios) {
      return NextResponse.json({ error: 'Dados incompletos para criar configuração' }, { status: 400 });
    }

    const newConfig = await prisma.frequenciaConfig.create({
      data: {
        nome,
        latitude,
        longitude,
        raio,
        horarios,
        diasDaSemana,
        ativo: ativo ?? true,
      },
    });

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar configuração de frequência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
