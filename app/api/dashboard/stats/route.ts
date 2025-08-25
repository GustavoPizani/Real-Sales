import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);

    const totalClients = await prisma.cliente.count();
    const activeClients = await prisma.cliente.count({
      where: { status: { notIn: ['Ganho', 'Perdido'] } },
    });
    const totalProperties = await prisma.imovel.count();
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
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}