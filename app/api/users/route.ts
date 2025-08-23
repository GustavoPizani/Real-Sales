import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const users = await prisma.usuario.findMany({
      include: { superior: true }, // Inclui os dados do superior (manager)
      orderBy: { createdAt: 'desc' },
    });
    
    // Mapeia o campo 'nome' do banco para 'name' que o frontend espera
    const formattedUsers = users.map(u => ({
        ...u,
        name: u.nome,
        role: u.role,
        manager: u.superior ? { ...u.superior, name: u.superior.nome, role: u.superior.role } : null
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== 'marketing_adm') {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, manager_id } = body;

    if (!name || !email || !password || !role) {
        return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: "Email já está em uso" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.usuario.create({
        data: {
            nome: name, // Salva o 'name' do formulário no campo 'nome' do banco
            email,
            passwordHash,
            role,
            superiorId: manager_id || null,
        }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
      console.error("Erro ao criar usuário:", error)
      return NextResponse.json({ error: "Erro interno ao criar usuário" }, { status: 500 });
  }
}
