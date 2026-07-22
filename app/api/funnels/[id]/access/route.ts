import { type NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from "@/lib/auth";
import { Role, FunnelAccessLevel } from "@prisma/client";

// GET /api/funnels/[id]/access — lista os usuários com acesso liberado a este funil
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = await getUserFromToken(token);

  if (!user || user.role !== Role.MARKETING_ADMIN) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const access = await prisma.userFunnelAccess.findMany({
    where: { funnelId: params.id },
    select: { userId: true },
  });

  return NextResponse.json({ userIds: access.map(a => a.userId) });
}

// PUT /api/funnels/[id]/access — substitui a lista de usuários com acesso liberado a este funil
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = await getUserFromToken(token);

  if (!user || user.role !== Role.MARKETING_ADMIN) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const funnelId = params.id;
  const body = await request.json();
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

  const funnel = await prisma.funnel.findUnique({ where: { id: funnelId }, select: { id: true } });
  if (!funnel) {
    return NextResponse.json({ error: "Funil não encontrado" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.userFunnelAccess.deleteMany({
      where: { funnelId, userId: { notIn: userIds } },
    }),
    ...userIds.map(userId =>
      prisma.userFunnelAccess.upsert({
        where: { userId_funnelId: { userId, funnelId } },
        update: {},
        create: { userId, funnelId, accessLevel: FunnelAccessLevel.FULL },
      })
    ),
  ]);

  return NextResponse.json({ userIds });
}
