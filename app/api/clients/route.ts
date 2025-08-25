// app/api/clients/route.ts

import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";

// GET: Busca clientes com base na hierarquia do usuário logado
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Monta a cláusula 'where' para filtrar clientes com base no cargo do usuário
    const where: Prisma.ClientWhereInput = {};
    if (user.role === Role.corretor) {
      // Corretores veem apenas seus próprios clientes
      where.brokerId = user.id;
    } else if (user.role === Role.gerente) {
      // Gerentes veem seus clientes e os clientes de seus subordinados
      const subordinateIds = (await prisma.user.findMany({ 
        where: { superiorId: user.id },
        select: { id: true }
      })).map(u => u.id);
      where.brokerId = { in: [user.id, ...subordinateIds] };
    }
    // Diretores e Admins não têm filtro, veem todos os clientes

    const clients = await prisma.client.findMany({
      where,
      include: { 
        broker: { select: { name: true, id: true } } // Inclui o corretor associado
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    // Formata a resposta para o frontend
    const formattedClients = clients.map(c => ({
      ...c,
      full_name: c.fullName, // Garante compatibilidade com o frontend
      assigned_user: c.broker ? { id: c.brokerId, name: c.broker.name } : null,
      funnel_status: c.currentFunnelStage // Garante compatibilidade
    }));

    return NextResponse.json({ clients: formattedClients });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST: Cria um novo cliente
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const { full_name, email, phone, funnel_status } = body;

        if (!full_name) {
             return NextResponse.json({ error: "Nome completo é obrigatório" }, { status: 400 });
        }

        const newClient = await prisma.client.create({
            data: {
                fullName: full_name,
                email,
                phone,
                currentFunnelStage: funnel_status || 'Contato', // Usa o novo campo
                brokerId: user.id, // Atribui ao usuário que está criando
            }
        });

        return NextResponse.json(newClient, { status: 201 });
    } catch (error) {
        console.error("Erro ao criar cliente:", error);
        return NextResponse.json({ error: "Erro interno ao criar cliente" }, { status: 500 });
    }
}
