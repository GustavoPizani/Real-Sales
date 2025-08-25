// app/api/leads/[id]/convert/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// Função auxiliar para encontrar o próximo corretor na roleta ativa
async function getNextBrokerFromRoleta() {
  const activeRoleta = await prisma.roleta.findFirst({
    where: { isActive: true },
    include: {
      brokers: {
        include: {
          broker: true,
        },
        orderBy: {
          broker: {
            createdAt: 'asc', // Garante uma ordem consistente
          },
        },
      },
    },
  });

  if (!activeRoleta || activeRoleta.brokers.length === 0) {
    return null; // Nenhuma roleta ativa ou sem corretores
  }

  const nextIndex = (activeRoleta.lastAssignedIndex + 1) % activeRoleta.brokers.length;
  const nextBrokerId = activeRoleta.brokers[nextIndex].brokerId;

  // Atualiza o índice na roleta para a próxima atribuição
  await prisma.roleta.update({
    where: { id: activeRoleta.id },
    data: { lastAssignedIndex: nextIndex },
  });

  return nextBrokerId;
}

// POST: Converte um Lead em Cliente
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const leadId = params.id;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }
    if (lead.status === 'converted') {
        return NextResponse.json({ error: 'Este lead já foi convertido' }, { status: 400 });
    }

    // Verifica se já existe um cliente com o mesmo email
    if (lead.email) {
      const existingClient = await prisma.client.findUnique({ where: { email: lead.email } });
      if (existingClient) {
        return NextResponse.json({ error: 'Já existe um cliente com este email' }, { status: 409 });
      }
    }

    // Determina a quem o novo cliente será atribuído
    const brokerId = await getNextBrokerFromRoleta();
    if (!brokerId) {
        return NextResponse.json({ error: 'Nenhum corretor disponível na roleta para atribuição.' }, { status: 500 });
    }

    // Usa uma transação para garantir a atomicidade da operação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cria o novo cliente
      const newClient = await tx.client.create({
        data: {
          fullName: lead.name,
          email: lead.email,
          phone: lead.phone,
          brokerId: brokerId,
          // Outros campos podem ser preenchidos com base no lead.notes se necessário
        },
      });

      // 2. Atualiza o status do lead para 'converted'
      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'converted' },
      });

      return newClient;
    });

    return NextResponse.json({
      message: 'Lead convertido com sucesso!',
      client: result,
    });

  } catch (error) {
    console.error(`Erro ao converter lead ${params.id}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor ao converter lead.' }, { status: 500 });
  }
}
