import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getUserFromToken } from "@/lib/auth";

// Depende do login de quem chama: nunca pré-renderizar no build.
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== Role.MARKETING_ADMIN) return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  try {
    const funnels = await prisma.funnel.findMany({
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    const roulettes = await prisma.leadRoulette.findMany({
      where: { isActive: true },
    });

    return NextResponse.json({ funnels, roulettes });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
