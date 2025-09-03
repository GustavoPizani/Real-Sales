// app/api/clients/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
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

// Schema de validação para a criação de um novo cliente
const createClientSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório." }),
  corretorId: z.string().uuid({ message: "ID do corretor inválido." }),
  currentFunnelStage: z.string().min(1, { message: "Estágio do funil é obrigatório." }),
  email: z.string().email({ message: "Email inválido." }).optional().or(z.literal('')),
  telefone: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const token = cookies().get('authToken')?.value;
        const user = await getUserFromToken(token);
        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }
        
        const body = await request.json();

        // <<--- SCAN INSTALADO AQUI --- >>
        console.log('[API /api/clients] Received body for validation:', JSON.stringify(body, null, 2));
        
        // Valida os dados recebidos com o schema do Zod
        const validation = createClientSchema.safeParse(body);
        if (!validation.success) {
          // Retorna um erro detalhado se a validação falhar
          return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { nomeCompleto, email, telefone, corretorId, currentFunnelStage } = validation.data;

        const newClient = await prisma.cliente.create({
            data: {
                nomeCompleto,
                email: email || null, // Garante que o email seja null se for uma string vazia
                telefone,
                currentFunnelStage,
                corretorId, // Usa o corretorId validado do corpo da requisição
            }
        });

        return NextResponse.json(newClient, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Erro de violação de chave estrangeira (ex: corretorId não existe)
            if (error.code === 'P2003') {
                return NextResponse.json({ error: `Falha de referência: O campo '${error.meta?.field_name}' não é válido.` }, { status: 400 });
            }
        }
        console.error("Erro ao criar cliente:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}