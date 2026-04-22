import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.leadPool.upsert({ where: { name: 'Prioritário' }, update: {}, create: { name: 'Prioritário' } });
    await prisma.leadPool.upsert({ where: { name: 'Geral' }, update: {}, create: { name: 'Geral' } });

    const users = await prisma.user.findMany({
      where: { role: { in: [Role.BROKER, Role.MANAGER] } },
      select: { id: true, name: true },
    });

    const poolUsers = await prisma.leadPoolUser.findMany({
      include: { leadPool: true },
    });

    const permissionsByPool = {
      prioritario: poolUsers.filter(p => p.leadPool.name === 'Prioritário').map(p => p.userId),
      geral: poolUsers.filter(p => p.leadPool.name === 'Geral').map(p => p.userId),
    };

    const config = { raioAtribuicaoMetros: 0, tempoAteBolsaoPrioritarioMinutos: 60, tempoAteBolsaoGeralMinutos: 120 };

    return NextResponse.json({ config, users, permissions: permissionsByPool });
  } catch (error) {
    console.error('Erro configuracao GET:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { permissions } = body;

    const bolsaoPrioritario = await prisma.leadPool.findUnique({ where: { name: 'Prioritário' } });
    const bolsaoGeral = await prisma.leadPool.findUnique({ where: { name: 'Geral' } });

    if (!bolsaoPrioritario || !bolsaoGeral) {
      return NextResponse.json({ error: 'Bolsões não encontrados' }, { status: 500 });
    }

    await prisma.$transaction([
      prisma.leadPoolUser.deleteMany({ where: { leadPoolId: bolsaoPrioritario.id } }),
      prisma.leadPoolUser.createMany({
        data: (permissions.prioritario as string[]).map(userId => ({ leadPoolId: bolsaoPrioritario.id, userId })),
      }),
      prisma.leadPoolUser.deleteMany({ where: { leadPoolId: bolsaoGeral.id } }),
      prisma.leadPoolUser.createMany({
        data: (permissions.geral as string[]).map(userId => ({ leadPoolId: bolsaoGeral.id, userId })),
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro configuracao POST:', error);
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 });
  }
}
