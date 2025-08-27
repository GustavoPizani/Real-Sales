// app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // CORREÇÃO: Importação do cliente Prisma que estava faltando
import { getUserFromToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";

// GET: Busca todos os utilizadores
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const users = await prisma.usuario.findMany({ // Agora 'prisma' está definido
      include: { 
        superior: true
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const formattedUsers = users.map(u => ({
        ...u,
        manager: u.superior ? { name: u.superior.nome, role: u.superior.role } : null
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Erro ao buscar utilizadores:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST: Cria um novo utilizador
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== Role.marketing_adm) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, manager_id } = body;

    if (!name || !email || !password || !role) {
        return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 });
    }

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: "Email já está em uso" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.usuario.create({
        data: {
            nome: name,
            email,
            passwordHash,
            role,
            superiorId: manager_id || null,
        }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
      console.error("Erro ao criar utilizador:", error)
      return NextResponse.json({ error: "Erro interno ao criar utilizador" }, { status: 500 });
  }
}