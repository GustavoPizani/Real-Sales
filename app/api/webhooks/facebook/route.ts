// app/api/webhooks/facebook/route.ts

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

// GET: Rota para verificação do webhook do Facebook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Use uma variável de ambiente para o token de verificação
  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook do Facebook verificado com sucesso.');
    return new NextResponse(challenge);
  }

  console.error('Falha na verificação do webhook do Facebook.');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST: Recebe os dados de leads do Facebook
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Processa os dados de leadgen do Facebook
    if (data.object === 'page') {
      for (const entry of data.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadgenData = change.value;
            const leadData: { [key: string]: any } = {};
            
            // Extrai os dados dos campos do formulário do Facebook
            for (const field of leadgenData.field_data) {
                leadData[field.name] = field.values[0];
            }

            // Busca os mapeamentos de campo para a fonte 'facebook'
            const mappings = await prisma.fieldMapping.findMany({
              where: { source: 'facebook' },
            });

            // Mapeia os dados recebidos para os campos do nosso modelo Lead
            const newLeadData: { [key: string]: any } = {
                source: 'meta_ads',
                notes: leadData // Salva o payload original para referência
            };

            mappings.forEach(mapping => {
              if (leadData[mapping.mappedField]) {
                const prismaFieldName = mapping.fieldName === 'full_name' ? 'name' : mapping.fieldName;
                newLeadData[prismaFieldName] = leadData[mapping.mappedField];
              }
            });

            // Validação para garantir que temos o mínimo de informação
            if (!newLeadData.name || !newLeadData.email) {
                console.warn('Lead do Facebook recebido sem nome ou email. Dados:', leadData);
                continue; // Pula para o próximo lead
            }

            // Cria o novo lead no banco de dados
            await prisma.lead.create({
              data: {
                name: newLeadData.name,
                email: newLeadData.email,
                phone: newLeadData.phone,
                source: newLeadData.source,
                notes: newLeadData.notes,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no webhook do Facebook:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
