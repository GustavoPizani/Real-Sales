import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    // const body = await request.json(); // Descomente se precisar de dados do corpo da requisição

    // Lógica para converter o lead em cliente
    const result = await prisma.client.update({
      where: { id: leadId },
      data: {
        // Exemplo: atualiza o status do cliente
        status: 'ATIVO',
      },
      include: {
        BROKER: true,
      },
    });

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
