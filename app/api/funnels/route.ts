import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

// GET /api/funnels - Lista todos os funis com suas etapas
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        const user = await getUserFromToken(token);

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Administradores e gerentes podem ver todos os funis
        // Outros usuários verão apenas os funis aos quais têm acesso
        let whereClause = {};
        if (![Role.marketing_adm, Role.diretor, Role.gerente].includes(user.role)) {
            whereClause = {
                userAccess: {
                    some: {
                        userId: user.id,
                    }
                }
            };
        }

        const funnels = await prisma.funnel.findMany({
            where: whereClause,
            // A inclusão das etapas foi movida para fora da cláusula 'where'
            include: {
                stages: { orderBy: { order: 'asc' } }, // Garante que as etapas venham ordenadas
                userAccess: { include: { user: { select: { id: true, nome: true, role: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json({ funnels });

    } catch (error) {
        console.error("Erro ao buscar funis:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}

// POST /api/funnels - Cria um novo funil
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        const user = await getUserFromToken(token);

        if (!user || ![Role.marketing_adm, Role.diretor].includes(user.role)) {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        const body = await request.json();
        const { name, isDefaultEntry } = body;

        if (!name) {
            return NextResponse.json({ error: "O nome do funil é obrigatório" }, { status: 400 });
        }

        // Se este funil for o padrão, desmarca qualquer outro
        if (isDefaultEntry) {
            await prisma.funnel.updateMany({
                where: { isDefaultEntry: true },
                data: { isDefaultEntry: false },
            });
        }

        const newFunnel = await prisma.funnel.create({
            data: {
                name,
                isDefaultEntry: isDefaultEntry || false,
                // Cria uma etapa inicial padrão
                stages: {
                    create: [
                        { name: 'Contato', order: 1, color: '#010f27' },
                        { name: 'Qualificação', order: 2, color: '#3B82F6' },
                    ]
                }
            },
            include: {
                stages: true
            }
        });

        return NextResponse.json(newFunnel, { status: 201 });

    } catch (error) {
        console.error("Erro ao criar funil:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}
