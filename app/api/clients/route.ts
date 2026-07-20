// app/api/clients/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";
import { z } from 'zod';
import { notifyNewLead } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

const STATUS_FILTER_VALUES = new Set(['ACTIVE', 'WON', 'LOST']);

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const where: Prisma.ClientWhereInput = {
      // Filtro de Tenant: Garante que a query só retorne dados da conta do usuário
      accountId: user.isSuperAdmin ? undefined : user.accountId,
    };

    // Filtro opcional de status (ex.: Pipeline pede só os ACTIVE por padrão,
    // pra não trazer o histórico de Ganhos/Perdidos no carregamento inicial).
    // Sem o parâmetro, o comportamento é o mesmo de antes (traz tudo).
    const statusParam = request.nextUrl.searchParams.get('status');
    if (statusParam && STATUS_FILTER_VALUES.has(statusParam)) {
      where.overallStatus = statusParam as Prisma.ClientWhereInput['overallStatus'];
    }

    // Lógica de permissão por cargo (mantida)
    if (user.role === Role.BROKER) {
      where.brokerId = user.id;
    }
    // Marketing Admins veem todos os clientes DENTRO DO SEU TENANT.

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
        const user = await getUserFromToken();
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
