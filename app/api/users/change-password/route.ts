import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Não autorizado: Nenhum usuário autenticado.' },
      { status: 401 }
    );
  }

  const { newPassword } = await request.json();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase password change error:', error.message);
    return NextResponse.json({ error: 'Falha ao alterar a senha.' }, { status: 500 });
  }

  await supabase.auth.signOut({ scope: 'others' });

  return NextResponse.json({ message: 'Senha alterada com sucesso. Você será desconectado.' });
}