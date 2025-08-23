// app/api/dashboard/stats/route.ts

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);

    // Total de Clientes Ativos
    const activeClients = await prisma.cliente.count({
      where: {
        status: {
          notIn: ['Ganho', 'Perdido'],
        },
      },
    });

    // Total de Imóveis Ativos
    const totalProperties = await prisma.imovel.count({
      where: {
        status: {
          in: ['Disponivel', 'Reservado'], // Note que o Enum usa 'Disponivel'
        },
      },
    });

    // Total de Clientes (geral)
    const totalClients = await prisma.cliente.count();

    // Taxa de Conversão (simples, pode ser aprimorada)
    const conversionRate = totalClients > 0 ? (await prisma.cliente.count({ where: { status: 'Ganho' } }) / totalClients) * 100 : 0;

    return NextResponse.json({
      totalClients,
      activeClients,
      totalProperties,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar estatísticas.' },
      { status: 500 }
    );
  }
}