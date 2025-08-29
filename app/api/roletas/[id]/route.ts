import { NextRequest, NextResponse } from 'next/server';
// Caminho da importação corrigido
import { prisma } from '@/lib/prisma';

// Exemplo de handler GET para uma roleta específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roleta = await prisma.roleta.findUnique({
      where: { id: params.id },
      include: {
        participantes: true, // Exemplo de inclusão de dados relacionados
      },
    });

    if (!roleta) {
      return NextResponse.json({ error: 'Roleta não encontrada' }, { status: 404 });
    }

    return NextResponse.json(roleta);
  } catch (error) {
    console.error('Erro ao buscar roleta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
