import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Cliente } from '@prisma/client';

// Função auxiliar movida para fora do handler principal para melhor estrutura
async function sendSlackNotification(brokerId: string, client: Cliente) {
  // Lógica para enviar notificação para o Slack
  console.log(`Notificando Slack para o corretor ${brokerId} sobre o cliente ${client.nomeCompleto}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    // const body = await request.json(); // Descomente se precisar de dados do corpo da requisição

    // Lógica para converter o lead em cliente
    const result = await prisma.cliente.update({
      where: { id: leadId },
      data: {
        // Exemplo: atualiza o status do cliente
        status: 'ATIVO',
      },
      include: {
        corretor: true,
      },
    });

    if (result && result.corretorId) {
      await sendSlackNotification(result.corretorId, result);
    }

    // O `return` agora está corretamente posicionado dentro do bloco `try`
    return NextResponse.json({
      message: 'Lead convertido com sucesso!',
      client: result,
    });

  } catch (error) {
    console.error('Erro ao converter lead:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao converter o lead.' },
      { status: 500 }
    );
  }
}
