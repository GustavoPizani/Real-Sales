// app/api/dashboard/stats/route.ts

import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { hideTestClients } from '@/lib/test-account'
import { Role, ClientOverallStatus, Prisma } from '@prisma/client'

// Força a rota a ser sempre dinâmica, resolvendo o erro de build da Vercel.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Admin vê a conta inteira; corretor, só os próprios clientes.
    const where: Prisma.ClientWhereInput = {
      broker: { accountId: user.accountId },
      ...hideTestClients(user),
      ...(user.role !== Role.MARKETING_ADMIN && { brokerId: user.id }),
    };

    const [hierarchicalTotalClients, hierarchicalActiveClients, wonClients, totalProperties] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.count({ where: { ...where, overallStatus: ClientOverallStatus.ACTIVE } }),
      prisma.client.count({ where: { ...where, overallStatus: ClientOverallStatus.WON } }),
      // Property não tem accountId: a contagem é de todos os imóveis do banco.
      prisma.property.count(),
    ]);

    // Conversão = clientes ganhos sobre o total. (Antes dividia os ATIVOS pelo
    // total, o que media quantos ainda estavam em andamento, não quantos compraram.)
    const conversionRate = hierarchicalTotalClients > 0 ? (wonClients / hierarchicalTotalClients) * 100 : 0

    return NextResponse.json({
      // A tela de marketing lê `totalClients`; o campo não existia e o número saía sempre 0.
      totalClients: hierarchicalTotalClients,
      hierarchicalTotalClients,
      hierarchicalActiveClients,
      wonClients,
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
