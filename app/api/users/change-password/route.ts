import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken, verifyPassword, hashPassword, UserPayload } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Extrai o token do cookie httpOnly
        const token = request.cookies.get('authToken')?.value;
        const currentUser: UserPayload | null = await getUserFromToken(token);

        if (!currentUser || !currentUser.id) {
          
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórias.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const userFromDb = await prisma.usuario.findUnique({
      where: { id: currentUser.id },
    });

    if (!userFromDb || !userFromDb.passwordHash) {
      return NextResponse.json({ error: 'Utilizador não encontrado ou sem senha definida.' }, { status: 404 });
    }

    const isPasswordValid = await verifyPassword(currentPassword, userFromDb.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'A senha atual está incorreta.' }, { status: 403 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.usuario.update({
      where: { id: currentUser.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
