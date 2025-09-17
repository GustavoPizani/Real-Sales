import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

interface TransitionBody {
    roletaId?: string; // Alterado para receber roletaId
}

export async function POST(request: NextRequest, { params }: { params: { clientId: string } }) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        const user = await getUserFromToken(token);
        const { clientId } = params;

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Lógica de permissão: Apenas usuários de pré-vendas ou admins podem mover
        if (![Role.pre_vendas, Role.marketing_adm, Role.diretor].includes(user.role)) {
            return NextResponse.json({ error: "Acesso negado para realizar esta transição." }, { status: 403 });
        }

        const body: TransitionBody = await request.json();
        const { roletaId } = body;

        if (!roletaId) {
            return NextResponse.json({ error: "ID da roleta é obrigatório." }, { status: 400 });
        }

        // --- Lógica da Roleta ---
        const roleta = await prisma.roleta.findUnique({
            where: { id: roletaId },
            include: { corretores: { include: { corretor: true }, orderBy: { corretor: { nome: 'asc' } } } }
        });

        if (!roleta || !roleta.ativa || roleta.corretores.length === 0) {
            return NextResponse.json({ error: "Roleta inválida, inativa ou sem corretores." }, { status: 400 });
        }

        // Lógica Round-Robin
        const nextIndex = (roleta.lastAssignedIndex + 1) % roleta.corretores.length;
        const nextCorretor = roleta.corretores[nextIndex].corretor;

        // Encontrar o funil de vendas principal (ou o primeiro que não seja de pré-vendas)
        const targetFunnel = await prisma.funnel.findFirst({
            where: { isPreSales: false },
            include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
        });

        if (!targetFunnel || targetFunnel.stages.length === 0) {
            return NextResponse.json({ error: "Nenhum funil de destino (vendas) configurado." }, { status: 400 });
        }

        const firstStageOfTargetFunnel = targetFunnel.stages[0];

        // Transação para garantir atomicidade
        const [updatedClient] = await prisma.$transaction([
            prisma.cliente.update({
                where: { id: clientId },
                data: {
                    funnelId: targetFunnel.id,
                    funnelStageId: firstStageOfTargetFunnel.id,
                    corretorId: nextCorretor.id,
                }
            }),
            prisma.roleta.update({
                where: { id: roletaId },
                data: { lastAssignedIndex: nextIndex }
            })
        ]);

        // 3. (Opcional, mas recomendado) Criar uma nota de histórico
        await prisma.nota.create({
            data: {
                clienteId: clientId,
                content: `Lead movido do funil anterior para "${targetFunnel.name}" por ${user.nome}.`,
                createdBy: user.nome,
            }
        });

        return NextResponse.json(updatedClient);
    } catch (error) {
        console.error("Erro na transição do cliente:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}
