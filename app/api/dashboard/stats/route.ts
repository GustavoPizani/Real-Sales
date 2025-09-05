// app/api/dashboard/stats/route.ts

import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getUserFromToken } from '@/lib/auth'
import { Role } from '@prisma/client'

// Força a rota a ser sempre dinâmica, resolvendo o erro de build da Vercel.
export const dynamic = 'force-dynamic';

async function getSubordinateIds(userId: string): Promise<string[]> {
  const subordinates = await prisma.usuario.findMany({
    where: { superiorId: userId },
    select: { id: true },
  })
  let idsToProcess = [userId];
  const allSubordinateIds = new Set<string>();

  const subordinateIds = subordinates.map((sub) => sub.id)
  while (idsToProcess.length > 0) {
    const currentLevelIds = await prisma.usuario.findMany({
      where: { superiorId: { in: idsToProcess } },
      select: { id: true },
    });

  const nestedSubordinates = await Promise.all(
    subordinateIds.map((id) => getSubordinateIds(id)),
  )
    const newIds = currentLevelIds.map(u => u.id);
    if (newIds.length === 0) {
      break;
    }

  return subordinateIds.concat(...nestedSubordinates)
    newIds.forEach(id => allSubordinateIds.add(id));
    idsToProcess = newIds;
  }

  return Array.from(allSubordinateIds);
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    if (!userPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await prisma.usuario.findUnique({ where: { id: userId } })
    // Utiliza a função centralizada para obter o usuário, que é mais segura e limpa.
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let userIdsForFilter: string[] = [userId]
    let userIdsForFilter: string[] = [user.id]
    if (user.role === 'diretor' || user.role === 'gerente') {
      const subordinateIds = await getSubordinateIds(userId)
      const subordinateIds = await getSubordinateIds(user.id)
      userIdsForFilter.push(...subordinateIds)
    }

    const hierarchicalTotalClients = await prisma.cliente.count({
      where: { corretorId: { in: userIdsForFilter } },
    })
    // Agrupa as consultas para melhor performance
    const [hierarchicalTotalClients, hierarchicalActiveClients, totalProperties] = await prisma.$transaction([
      prisma.cliente.count({
        where: { corretorId: { in: userIdsForFilter } },
      }),
      prisma.cliente.count({
        where: { corretorId: { in: userIdsForFilter }, overallStatus: 'Ativo' },
      }),
      prisma.imovel.count()
    ]);

    const hierarchicalActiveClients = await prisma.cliente.count({
      where: {
        corretorId: { in: userIdsForFilter },
        overallStatus: 'Ativo',
      },
    })

    const totalProperties = await prisma.imovel.count();
    const conversionRate =
      hierarchicalTotalClients > 0
        ? (hierarchicalActiveClients / hierarchicalTotalClients) * 100
        : 0

    return NextResponse.json({
      hierarchicalTotalClients,
      hierarchicalActiveClients,
      totalProperties,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar estatísticas.' },
      { status: 500 }
    )
  }
}
