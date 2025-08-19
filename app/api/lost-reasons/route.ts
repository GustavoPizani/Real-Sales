// app/api/lost-reasons/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Busca todos os motivos de perda no banco de dados
    const reasons = await prisma.lostReason.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });
    return NextResponse.json({ reasons });
  } catch (error) {
    console.error('Erro ao buscar motivos de perda:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

// Você pode adicionar aqui as funções POST, PATCH, DELETE no futuro
// para criar, editar e deletar motivos pelo formulário.
