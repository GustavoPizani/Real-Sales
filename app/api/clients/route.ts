// app/api/clients/route.ts
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const where: Prisma.ClienteWhereInput = {};
    if (user.role === Role.corretor) {
      where.corretorId = user.id;
    } else if (user.role === Role.gerente) {
      const subordinateIds = (await prisma.usuario.findMany({ 
        where: { superiorId: user.id },
        select: { id: true }
      })).map(u => u.id);
      where.corretorId = { in: [user.id, ...subordinateIds] };
    }

    const clients = await prisma.cliente.findMany({
      where,
      include: { 
        corretor: { select: { nome: true, id: true } }
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    return NextResponse.json({ clients });
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
        const { fullName, email, phone, funnelStage } = body;

        if (!fullName) {
             return NextResponse.json({ error: "Nome completo é obrigatório" }, { status: 400 });
        }

        const newClient = await prisma.cliente.create({
            data: {
                nomeCompleto: fullName,
                email,
                telefone: phone,
                currentFunnelStage: funnelStage || 'Contato',
                corretorId: user.id,
            }
        });

        return NextResponse.json(newClient, { status: 201 });
    } catch (error) {
        console.error("Erro ao criar cliente:", error);
        return NextResponse.json({ error: "Erro interno ao criar cliente" }, { status: 500 });
    }
}