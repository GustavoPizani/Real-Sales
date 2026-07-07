import { randomInt } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Role } from '@prisma/client';

function generateTempPassword() {
  return `Nordic@${randomInt(100000, 1000000)}`;
}

// POST: Admin generates a new temporary password for a broker and forces change on next login
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser || currentUser.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Sem permissão para redefinir senhas.' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const tempPassword = generateTempPassword();

    const supabaseAdmin = createAdminClient();
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: tempPassword,
    });

    if (authError) {
      console.error('Erro ao redefinir senha no Supabase Auth:', authError.message);
      return NextResponse.json({ error: 'Falha ao redefinir a senha.' }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { mustChangePassword: true },
    });

    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/login`;
    const message = `Olá ${targetUser.name}! Sua senha de acesso ao Nordic CRM foi redefinida.\n\nAcesso: ${loginUrl}\nE-mail: ${targetUser.email}\nNova senha temporária: ${tempPassword}\n\nAo entrar, você será solicitado(a) a criar uma nova senha.`;

    return NextResponse.json({ tempPassword, message });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return NextResponse.json({ error: 'Erro interno ao redefinir a senha.' }, { status: 500 });
  }
}
