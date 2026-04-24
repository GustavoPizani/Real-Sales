// app/api/clients/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";
import { z } from 'zod';
import { notifyNewLead } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const where: Prisma.ClientWhereInput = {
      // Filtro de Tenant: Garante que a query só retorne dados da conta do usuário
      accountId: user.isSuperAdmin ? undefined : user.accountId,
    };

    // Lógica de permissão por cargo (mantida)
    if (user.role === Role.MANAGER) {
      const subordinateIds = (await prisma.user.findMany({
        where: { supervisorId: user.id },
        select: { id: true }
      })).map(u => u.id);
      where.brokerId = { in: [user.id, ...subordinateIds] };
    } else if (user.role === Role.BROKER) {
      where.brokerId = user.id;
    } else if (user.role === Role.PRE_SALES) {
        const preSalesFunnel = await prisma.funnel.findFirst({ where: { isPreSales: true }});
        if (preSalesFunnel) {
            where.funnelId = preSalesFunnel.id;
        } else {
            // Se não houver funil de pré-vendas, eles não veem ninguém.
            where.id = '-1'; // Condição impossível
        }
    }
    // Super Admins e outros cargos sem filtro específico veem todos os clientes DENTRO DO SEU TENANT.

    const clients = await prisma.client.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        funnelId: true,
        funnelStageId: true,
        overallStatus: true,
        brokerId: true,
        broker: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ clients }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// Schema de validação para a criação de um novo cliente
const createClientSchema = z.object({
    fullName: z.string().min(1, { message: "Nome completo é obrigatório." }),
    brokerId: z.string().uuid({ message: "ID do BROKER inválido." }),
    funnelId: z.string().uuid({ message: "ID do funil é obrigatório." }),
    funnelStageId: z.string().uuid({ message: "ID da etapa do funil é obrigatório." }),
    email: z.string().email({ message: "Email inválido." }).optional().or(z.literal('')),
    phone: z.string().optional(),
});


export async function POST(request: NextRequest) {
    try {
        const token = cookies().get('authToken')?.value;
        const user = await getUserFromToken(token);
        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }
        
        const body = await request.json();

        // Valida os dados recebidos com o schema do Zod
        const validation = createClientSchema.safeParse(body);
        if (!validation.success) {
          // Retorna um erro detalhado se a validação falhar
          return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten().fieldErrors }, { status: 400 });
        }
        
        const { fullName, email, phone, brokerId, funnelId, funnelStageId } = validation.data;

        const newClient = await prisma.client.create({
            data: {
                fullName,
                email: email || null,
                phone,
                funnelId,
                funnelStageId,
                brokerId,
                createdById: user.id,
                accountId: user.accountId,
            }
        });

        // Notifica corretor (e admins) se o lead foi atribuído a outra pessoa
        if (brokerId !== user.id) {
            const broker = await prisma.user.findUnique({
                where: { id: brokerId },
                select: { name: true },
            });
            notifyNewLead({
                clientId: newClient.id,
                clientName: fullName,
                brokerId,
                brokerName: broker?.name ?? 'Corretor',
                accountId: user.accountId,
            }).catch(() => null);
        }

        return NextResponse.json(newClient, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Erro de violação de chave estrangeira (ex: brokerId não existe)
            if (error.code === 'P2003') {
                return NextResponse.json({ error: `Falha de referência: O campo '${error.meta?.field_name}' não é válido.` }, { status: 400 });
            }
        }
        console.error("Erro ao criar cliente:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}
