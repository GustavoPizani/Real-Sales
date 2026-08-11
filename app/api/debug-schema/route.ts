// TEMPORÁRIO — diagnóstico do erro "createdAt does not exist" em produção. Remover depois.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const columns = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'active_offers' ORDER BY ordinal_position`
    );

    let dbHost = 'unknown';
    try {
      dbHost = new URL(process.env.DATABASE_URL || '').host;
    } catch {}

    return NextResponse.json({
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      dbHost,
      activeOffersColumns: columns.map(c => c.column_name),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
