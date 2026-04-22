// app/api/clients/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
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
            broker: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    supervisor: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            propertyOfInterest: {
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
            documents: true,
            notes: {
                orderBy: { id: 'desc' },
            },
            tasks: {
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
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const client = await getClientWithDetails(params.id);

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ client });

  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}