// app/api/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/generate-temp-password";
import { type NextRequest } from "next/server";
import { Prisma, Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const where: Prisma.UserWhereInput = {
      // Filtro de Tenant: mesma regra usada em /api/clients
      accountId: user.isSuperAdmin ? undefined : user.accountId,
    };

    const users = await prisma.user.findMany({
      where,
      include: {
        supervisor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error("Erro ao buscar utilizadores:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: "Sem permissão para criar utilizadores" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, supervisorId } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Nome, email e cargo são obrigatórios." }, { status: 400 });
    }

    // Senha temporária gerada automaticamente — o usuário troca no primeiro acesso.
    const tempPassword = generateTempPassword();

    // 1. Cria o usuário no Supabase Auth (precisa da service role key)
    const adminSupabase = createAdminClient();
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      const isDuplicate = authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('email');
      const message = isDuplicate ? 'E-mail já cadastrado. Use outro e-mail.' : authError.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 2. Cria o perfil na tabela users com o UUID do Supabase
    const creatorAccountId = user.accountId ?? user.id;
    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        name,
        email,
        role: role as Role,
        accountId: creatorAccountId,
        supervisor: supervisorId ? { connect: { id: supervisorId } } : undefined,
        mustChangePassword: true,
      },
    });

    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/login`;
    const message = `Olá ${name}! Seu acesso ao Nordic CRM foi criado.\n\nAcesso: ${loginUrl}\nE-mail: ${email}\nSenha temporária: ${tempPassword}\n\nAo entrar, você será solicitado(a) a criar uma nova senha.`;

    return NextResponse.json({ ...newUser, tempPassword, message }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar utilizador:", error);
    return NextResponse.json({ error: "Erro interno ao criar utilizador" }, { status: 500 });
  }
}
