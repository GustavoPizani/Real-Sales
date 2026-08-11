// app/api/active-offers/[id]/clients/route.ts
// Adiciona mais clientes perdidos a uma campanha de Oferta Ativa já existente
// (fonte "Clientes Internos"), rodando o mesmo filtro usado na criação e
// pulando quem já está na campanha.
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role, ActiveOfferSource } from "@prisma/client";
import { buildLostClientWhere } from '@/lib/active-offers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: "Apenas administradores de marketing podem editar campanhas." }, { status: 403 });
    }

    const activeOffer = await prisma.activeOffer.findUnique({
      where: { id: params.id },
      select: { id: true, source: true },
    });
    if (!activeOffer) {
      return NextResponse.json({ error: "Oferta ativa não encontrada." }, { status: 404 });
    }
    if (activeOffer.source !== ActiveOfferSource.INTERNAL_CLIENTS) {
      return NextResponse.json({ error: "Só é possível adicionar clientes por filtro em campanhas de Clientes Internos." }, { status: 400 });
    }

    const { source, propertyOfInterestId, brokerId } = await request.json();
    if (!source) {
      return NextResponse.json({ error: "Fonte é obrigatória." }, { status: 400 });
    }

    const filterResult = await buildLostClientWhere(user, { source, propertyOfInterestId, brokerId });
    if ('error' in filterResult) {
      return NextResponse.json({ error: filterResult.error }, { status: filterResult.status });
    }

    const matchingClients = await prisma.client.findMany({
      where: filterResult.where,
      select: { id: true, fullName: true, email: true, phone: true },
    });

    if (matchingClients.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente encontrado para os critérios selecionados.", addedCount: 0, alreadyLinkedCount: 0 },
        { status: 404 }
      );
    }

    const existingLinks = await prisma.activeOfferClient.findMany({
      where: { activeOfferId: activeOffer.id, clientId: { in: matchingClients.map(c => c.id) } },
      select: { clientId: true },
    });
    const existingClientIds = new Set(existingLinks.map(l => l.clientId));

    const toCreate = matchingClients.filter(c => !existingClientIds.has(c.id));
    const alreadyLinkedCount = matchingClients.length - toCreate.length;

    // Nota: activeOfferClient.createMany() falha com "column does not exist" de forma
    // espúria sobre a conexão pooled do pgbouncer nesse projeto — create() individual
    // funciona normalmente.
    await Promise.all(toCreate.map(c =>
      prisma.activeOfferClient.create({
        data: {
          activeOfferId: activeOffer.id,
          clientId: c.id,
          fullName: c.fullName,
          email: c.email,
          phone: c.phone,
        },
      })
    ));

    return NextResponse.json({ addedCount: toCreate.length, alreadyLinkedCount });
  } catch (error) {
    console.error("Erro ao adicionar clientes à oferta ativa:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
