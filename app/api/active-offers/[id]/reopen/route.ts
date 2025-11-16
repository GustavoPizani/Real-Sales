// app/api/active-offers/[id]/reopen/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ClientOverallStatus } from '@prisma/client';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = request.cookies.get('authToken')?.value;
        const user = await getUserFromToken(token);

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const offerClientId = params.id;

        const offerClient = await prisma.activeOfferClient.findUnique({
            where: { id: offerClientId },
        });

        if (!offerClient) {
            return NextResponse.json({ error: 'Contato da oferta não encontrado.' }, { status: 404 });
        }

        if (offerClient.status === 'Reaberto') {
            return NextResponse.json({ error: 'Este contato já foi reaberto.' }, { status: 400 });
        }

        // Encontra o funil principal e a primeira etapa
        const mainFunnel = await prisma.funil.findFirst({ where: { isPreSales: false }, orderBy: { createdAt: 'asc' } });
        if (!mainFunnel) throw new Error("Nenhum funil de vendas principal encontrado.");

        const firstStage = await prisma.etapaFunil.findFirst({ where: { funilId: mainFunnel.id }, orderBy: { ordem: 'asc' } });
        if (!firstStage) throw new Error("Nenhuma etapa encontrada para o funil principal.");

        // Cria um novo cliente no pipeline principal
        const newClient = await prisma.cliente.create({
            data: {
                nomeCompleto: offerClient.contactName,
                email: offerClient.contactEmail,
                telefone: offerClient.contactPhone,
                proprietario: { connect: { id: user.id } }, // O proprietário é quem reabriu
                criadoPor: { connect: { id: user.id } },
                funil: { connect: { id: mainFunnel.id } },
                etapa: { connect: { id: firstStage.id } },
                overallStatus: ClientOverallStatus.Ativo,
                origem: `Oferta Ativa: ${offerClient.offerId}`,
            },
        });

        // Atualiza o status do contato na oferta ativa
        await prisma.activeOfferClient.update({
            where: { id: offerClientId },
            data: { status: 'Reaberto' },
        });

        return NextResponse.json({ message: 'Contato reaberto com sucesso!', cliente: newClient });

    } catch (error: any) {
        console.error("Erro ao reabrir contato:", error);
        return NextResponse.json({ error: 'Erro interno do servidor', details: error.message }, { status: 500 });
    }
}
