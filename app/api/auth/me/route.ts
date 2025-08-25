// app/api/auth/me/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Extrai o usuário do token presente no cabeçalho da requisição
    const user = await getUserFromToken(request);

    // Se o token for inválido ou o usuário não for encontrado, retorna não autorizado
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Se o usuário for encontrado, retorna seus dados
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Erro na rota /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
