// app/api/webhooks/site/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
            createdAt: 'asc', // Ordem consistente para a roleta
          },
        },
      },
    },
  });

  if (!activeRoleta || activeRoleta.brokers.length === 0) {
    return null;
  }

  const nextIndex = (activeRoleta.lastAssignedIndex + 1) % activeRoleta.brokers.length;
  const nextBrokerId = activeRoleta.brokers[nextIndex].brokerId;

  await prisma.roleta.update({
    where: { id: activeRoleta.id },
    data: { lastAssignedIndex: nextIndex },
  });

  return nextBrokerId;
}

// POST: Recebe dados de um formulário do site e cria um cliente
export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // 1. Busca os mapeamentos de campo para a fonte 'site'
    // CORREÇÃO: Acessando o modelo com nome em minúsculas para resolver o erro de tipagem.
    const mappings = await prisma.fieldMapping.findMany({
      where: { source: 'site' },
    });

    // 2. Mapeia os dados do formulário para os campos do cliente
    const clientData: { [key: string]: any } = {};
    mappings.forEach(mapping => {
      if (formData[mapping.mappedField]) {
        // Mapeia para os nomes de campo do Prisma (ex: fullName, phone)
        const prismaFieldName = mapping.fieldName === 'full_name' ? 'fullName' : mapping.fieldName;
        clientData[prismaFieldName] = formData[mapping.mappedField];
      }
    });

    // Validação básica
    if (!clientData.fullName || !clientData.email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios no formulário.' }, { status: 400 });
    }

    // 3. Encontra o próximo corretor na roleta
    const brokerId = await getNextBrokerFromRoleta();
    if (!brokerId) {
      return NextResponse.json({ error: 'Nenhuma roleta ativa ou corretor disponível para atribuição.' }, { status: 503 }); // 503 Service Unavailable
    }

    // 4. Cria o cliente no banco de dados
    const newClient = await prisma.client.create({
      data: {
        fullName: clientData.fullName,
        email: clientData.email,
        phone: clientData.phone,
        preferences: clientData.notes, // Usando o campo de preferências para as notas do formulário
        brokerId: brokerId,
        currentFunnelStage: 'Contato', // Etapa inicial padrão
      },
    });

    return NextResponse.json({
      success: true,
      clientId: newClient.id,
      assignedTo: brokerId,
    });
  } catch (error) {
    console.error('Erro no webhook do site:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
