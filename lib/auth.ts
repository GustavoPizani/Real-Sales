// lib/auth.ts
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';

// Interface para o objeto de usuário usado no frontend e no token
export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: Role;
  accountId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Recupera os dados do usuário com base na sessão atual do Supabase.
 * Recomendado para API Routes e Server Components.
 */
export async function getUserFromToken(request?: NextRequest): Promise<UserPayload | null> {
  // 1. Criar o cliente Supabase (Note o await aqui!)
  const supabase = await createClient();
  
  try {
    // 2. Recuperar o usuário da sessão (getUser é mais seguro que getSession no servidor)
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !supabaseUser) {
      if (authError) console.error('[AUTH] Supabase error:', authError.message);
      return null;
    }

    // 3. Buscar o perfil complementar no banco via Prisma (Schema em Inglês)
    const userProfile = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        accountId: true 
      },
    });

    if (!userProfile) {
      console.warn(`[AUTH] Supabase user ${supabaseUser.id} exists, but no profile found in public.users.`);
      return null;
    }

    // 4. Retornar o Payload consolidado
    return {
      ...userProfile,
      isSuperAdmin: userProfile.role === Role.MARKETING_ADMIN || userProfile.role === Role.DIRECTOR,
    };
  } catch (error: any) {
    console.error(`[AUTH] Unexpected error: ${error.message}`);
    return null;
  }
}