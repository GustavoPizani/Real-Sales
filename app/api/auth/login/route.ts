import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const token = generateToken(user);

    // =================================================================
    // MUDANÇA PRINCIPAL: Criamos a resposta PRIMEIRO
    // =================================================================
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name, // Supondo que o nome do usuário seja 'name'
        email: user.email,
        role: user.role,
      },
      token,
    });

    // =================================================================
    // AGORA, adicionamos o cookie diretamente na resposta
    // =================================================================
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 dia
    });

    return response; // Retornamos a resposta já com o cookie adicionado

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}