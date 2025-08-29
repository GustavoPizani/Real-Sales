import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, color } = await req.json();
  const stage = await prisma.funnelStage.update({
    where: { id: params.id },
    data: { name, color },
  });
  return NextResponse.json(stage);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.funnelStage.delete({
    where: { id: params.id },
  });
  return NextResponse.json({ success: true });
}