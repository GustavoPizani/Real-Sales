import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Lógica de filtros e hierarquia com Prisma
    const where: Prisma.ClienteWhereInput = {};
    if (user.role === 'corretor') {
      where.corretorId = user.id;
    } else if (user.role === 'gerente') {
      const subordinateIds = (await prisma.usuario.findMany({ 
        where: { superiorId: user.id },
        select: { id: true }
      })).map(u => u.id);
      where.corretorId = { in: [user.id, ...subordinateIds] };
    }

    const clients = await prisma.cliente.findMany({
      where,
      include: { corretor: { select: { nome: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedClients = clients.map(c => ({
      ...c,
      name: c.nomeCompleto,
      assigned_user: c.corretor ? { id: c.corretorId, name: c.corretor.nome } : null
    }));

    return NextResponse.json({ clients: formattedClients });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const { full_name, email, phone, funnel_status } = body;

        const newClient = await prisma.cliente.create({
            data: {
                nomeCompleto: full_name,
                email,
                telefone: phone,
                status: funnel_status || 'Contato',
                corretorId: user.id,
            }
        });

        return NextResponse.json(newClient, { status: 201 });
    } catch (error) {
        console.error("Erro ao criar cliente:", error);
        return NextResponse.json({ error: "Erro interno ao criar cliente" }, { status: 500 });
    }
}
