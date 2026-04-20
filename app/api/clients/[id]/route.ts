// app/api/clients/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * Fetches a single client with detailed information.
 */
async function getClientWithDetails(id: string) {
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            // FIX: The relation is named 'BROKER', not 'proprietario'
            BROKER: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    superior: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            imovelDeInteresse: {
                include: {
                    propertyTypes: true,
                },
            },
            funnel: {
                select: {
                    name: true,
                },
            },
            funnelStage: {
                select: {
                    name: true,
                },
            },
            documentos: {
                orderBy: { createdAt: 'desc' }
            },
            notas: {
                orderBy: {
                    createdAt: 'desc',
                },
            },
            tarefas: {
                orderBy: {
                    dateTime: 'desc',
                },
            },
            tags: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                },
            },
        },
    });
    return client;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const client = await getClientWithDetails(params.id);

    if (!client || (!user.isSuperAdmin && client.accountId !== user.accountId)) {
      return NextResponse.json({ error: "Cliente não encontrado ou acesso negado." }, { status: 404 });
    }

    return NextResponse.json({ client });

  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}