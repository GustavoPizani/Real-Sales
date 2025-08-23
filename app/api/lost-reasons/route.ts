import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const reasons = await prisma.lostReason.findMany({ orderBy: { created_at: 'asc' } });
    return NextResponse.json({ reasons });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { reason } = await request.json();
    if (!reason) {
      return NextResponse.json({ error: 'Descrição do motivo é obrigatória' }, { status: 400 });
    }
    const newReason = await prisma.lostReason.create({
      data: { reason },
    });
    return NextResponse.json(newReason, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}