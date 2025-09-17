import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role } from "@prisma/client";

// PUT /api/funnels/[id] - Atualiza um funil e suas etapas
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        const user = await getUserFromToken(token);

        if (!user || ![Role.marketing_adm, Role.diretor].includes(user.role)) {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        const funnelId = params.id;
        const body = await request.json();
        const { name, isPreSales, isDefaultEntry, stages } = body;

        if (!name || !stages) {
            return NextResponse.json({ error: "Dados incompletos para atualização." }, { status: 400 });
        }

        // Transação para garantir a consistência dos dados
        const updatedFunnel = await prisma.$transaction(async (tx) => {
            // Se este funil está sendo marcado como Pré-Vendas (que também o torna o padrão),
            // desmarca qualquer outro que possa ter essas flags.
            if (isPreSales) {
                await tx.funnel.updateMany({
                    where: { id: { not: funnelId } },
                    data: { isPreSales: false, isDefaultEntry: false },
                });
            }

            // 1. Atualiza os dados do funil principal
            const funnel = await tx.funnel.update({
                where: { id: funnelId },
                data: {
                    name,
                    isPreSales: isPreSales,
                    // O funil de pré-vendas é sempre o de entrada padrão
                    isDefaultEntry: isPreSales || isDefaultEntry,
                },
            });

            // 2. Pega os IDs das etapas existentes no banco
            const existingStages = await tx.funnelStage.findMany({
                where: { funnelId: funnelId },
                select: { id: true },
            });
            const existingStageIds = new Set(existingStages.map(s => s.id));

            // 3. Itera sobre as etapas enviadas pelo frontend
            for (const [index, stageData] of stages.entries()) {
                const data = {
                    name: stageData.name,
                    color: stageData.color,
                    order: index + 1, // Garante a ordem correta
                    funnelId: funnelId,
                };

                if (stageData.id.startsWith('new-')) {
                    // Cria nova etapa
                    await tx.funnelStage.create({ data });
                } else {
                    // Atualiza etapa existente
                    await tx.funnelStage.update({
                        where: { id: stageData.id },
                        data,
                    });
                    // Remove o ID da lista de existentes, para sabermos quem sobrou para deletar
                    existingStageIds.delete(stageData.id);
                }
            }

            // 4. Deleta as etapas que foram removidas no frontend
            if (existingStageIds.size > 0) {
                await tx.funnelStage.deleteMany({
                    where: {
                        id: { in: Array.from(existingStageIds) },
                    },
                });
            }

            return funnel;
        });

        return NextResponse.json(updatedFunnel);

    } catch (error) {
        console.error("Erro ao atualizar funil:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}

// DELETE /api/funnels/[id] - Exclui um funil
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        const user = await getUserFromToken(token);

        if (!user || ![Role.marketing_adm, Role.diretor].includes(user.role)) {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        // A exclusão em cascata configurada no schema.prisma cuidará de apagar as etapas
        await prisma.funnel.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Funil excluído com sucesso." }, { status: 200 });

    } catch (error: any) {
        if (error.code === 'P2003') { // Foreign key constraint
            return NextResponse.json({ error: "Não é possível excluir o funil pois existem clientes associados a ele." }, { status: 409 });
        }
        console.error("Erro ao excluir funil:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}
