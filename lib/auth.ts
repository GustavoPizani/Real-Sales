// lib/auth.ts
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { Role } from '@prisma/client';

// Precisa bater exatamente com o header setado em lib/supabase/middleware.ts.
// Só é confiável porque o middleware sempre apaga qualquer valor vindo do
// client antes de escrever o seu (validado). Rotas fora do matcher do
// middleware (api/webhooks, api/sessions, api/health) NUNCA podem confiar
// nesse header — hoje nenhuma delas chama getUserFromToken.
const TRUSTED_USER_HEADER = 'x-mw-user-id';

// Interface para o objeto de usuário usado no frontend e no token
export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: Role;
  accountId: string | null;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
}

/**
 * Recupera os dados do usuário com base na sessão atual do Supabase.
 * Recomendado para API Routes e Server Components.
 */
export async function getUserFromToken(request?: NextRequest): Promise<UserPayload | null> {
  try {
    // 1. O middleware já validou a sessão contra o Supabase Auth (round-trip
    // de rede) para todo request coberto pelo matcher e repassou o id do
    // usuário via header. Reaproveitamos isso em vez de revalidar de novo
    // aqui — evita bater no Supabase Auth outra vez por API route chamada.
    let supabaseUserId = (await headers()).get(TRUSTED_USER_HEADER);

    if (!supabaseUserId) {
      // Fallback: contexto sem middleware na frente (ex.: rota fora do
      // matcher). Faz a validação completa como antes.
      const supabase = await createClient();
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !supabaseUser) {
        if (authError) console.error('[AUTH] Supabase error:', authError.message);
        return null;
      }
      supabaseUserId = supabaseUser.id;
    }

    // 2. Buscar o perfil complementar no banco via Prisma (Schema em Inglês)
    const userProfile = await prisma.user.findUnique({
      where: { id: supabaseUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountId: true,
        mustChangePassword: true,
      },
    });

    if (!userProfile) {
      console.warn(`[AUTH] Supabase user ${supabaseUserId} exists, but no profile found in public.users.`);
      return null;
    }

    // 3. Retornar o Payload consolidado
    return {
      ...userProfile,
      isSuperAdmin: userProfile.role === Role.MARKETING_ADMIN,
    };
  } catch (error: any) {
    console.error(`[AUTH] Unexpected error: ${error.message}`);
    return null;
  }
}