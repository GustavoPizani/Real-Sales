import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { reason, active } = await request.json();
    
    let dataToUpdate: { reason?: string; active?: boolean } = {};
    if (reason !== undefined) {
      dataToUpdate.reason = reason;
    }
    if (active !== undefined) {
      dataToUpdate.active = active;
    }

    const updatedReason = await prisma.lostReason.update({
      where: { id: params.id },
      data: dataToUpdate,
    });
    return NextResponse.json(updatedReason);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }