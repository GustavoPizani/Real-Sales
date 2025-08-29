// c:\Users\gusta\Real-sales\app\api\users\route.ts
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { Prisma, Role } from "@prisma/client";

// GET: Busca todos os utilizadores
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const users = await prisma.usuario.findMany({
      include: { 
        superior: {
          select: {
            nome: true
          }
        } 
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json({ users: users });
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
        return NextResponse.json({ error: "Sem permissão para criar utilizadores" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, superiorId } = body;

    if (!name || !email || !password || !role) {
        return NextResponse.json({ error: "Nome, email, senha e cargo são obrigatórios." }, { status: 400 });
    }

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: "Este email já está em uso" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const data: Prisma.UsuarioCreateInput = {
      nome: name,
      email,
      passwordHash,
      role,
      superior: superiorId ? { connect: { id: superiorId } } : undefined,
    };

    const newUser = await prisma.usuario.create({
        data,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
      console.error("Erro ao criar utilizador:", error)
      return NextResponse.json({ error: "Erro interno ao criar utilizador" }, { status: 500 });
  }
}
