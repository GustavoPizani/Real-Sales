import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
