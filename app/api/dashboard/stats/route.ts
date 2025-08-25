// app/api/dashboard/stats/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ClientOverallStatus } from '@prisma/client';

export async function GET() {
  try {
    // Busca o total de clientes
    const totalClients = await prisma.cliente.count();

    // Busca o total de clientes ativos (que não estão com status 'Ganho' ou 'Perdido')
    const activeClients = await prisma.cliente.count({
      where: {
        overallStatus: ClientOverallStatus.Ativo,
      },
    });

    // Busca o total de imóveis
    const totalProperties = await prisma.imovel.count();

    // Calcula a taxa de conversão
    const wonClients = await prisma.cliente.count({
      where: {
        overallStatus: ClientOverallStatus.Ganho,
      },
    });

    const conversionRate = totalClients > 0 ? (wonClients / totalClients) * 100 : 0;

    // Retorna os dados em formato JSON
    return NextResponse.json({
      totalClients,
      activeClients,
      totalProperties,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    });
  } catch (error) {
    // Log detalhado do erro no servidor
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    
    // Retorna uma resposta de erro genérica para o cliente
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar estatísticas.' },
      { status: 500 }
    );
  }
}
