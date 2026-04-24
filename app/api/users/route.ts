// app/api/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { type NextRequest } from "next/server";
import { Prisma, Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
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
    const { name, email, password, role, supervisorId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Nome, email, senha e cargo são obrigatórios." }, { status: 400 });
    }

    // 1. Cria o usuário no Supabase Auth (precisa da service role key)
    const adminSupabase = createAdminClient();
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      const isDuplicate = authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('email');
      const message = isDuplicate ? 'E-mail já cadastrado. Use outro e-mail.' : authError.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 2. Cria o perfil na tabela users com o UUID do Supabase
    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        name,
        email,
        role: role as Role,
        supervisor: supervisorId ? { connect: { id: supervisorId } } : undefined,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar utilizador:", error);
    return NextResponse.json({ error: "Erro interno ao criar utilizador" }, { status: 500 });
  }
}
