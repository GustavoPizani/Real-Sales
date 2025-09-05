// app/api/dashboard/stats/route.ts

import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { Role } from '@prisma/client'

async function getSubordinateIds(userId: string): Promise<string[]> {
  const subordinates = await prisma.usuario.findMany({
    where: { superiorId: userId },
    select: { id: true },
  })

  const subordinateIds = subordinates.map((sub) => sub.id)

  const nestedSubordinates = await Promise.all(
    subordinateIds.map((id) => getSubordinateIds(id)),
  )

  return subordinateIds.concat(...nestedSubordinates)
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
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let userIdsForFilter: string[] = [userId]
    if (user.role === 'diretor' || user.role === 'gerente') {
      const subordinateIds = await getSubordinateIds(userId)
      userIdsForFilter.push(...subordinateIds)
    }

    const hierarchicalTotalClients = await prisma.cliente.count({
      where: { corretorId: { in: userIdsForFilter } },
    })

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
