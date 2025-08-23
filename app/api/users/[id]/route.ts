import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== 'marketing_adm') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const users = await prisma.usuario.findMany({
      include: { superior: true },
      orderBy: { createdAt: 'desc' },
    });
    
    const formattedUsers = users.map(u => ({
        ...u,
        name: u.nome,
        manager: u.superior ? { ...u.superior, name: u.superior.nome } : null
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
            nome: name,
            email,
            passwordHash,
            role,
            superiorId: manager_id || null,
        }
    });

    return NextResponse.json(newUser, { status: 201 });
}
