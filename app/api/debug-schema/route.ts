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

    const columns = await prisma.$queryRawUnsafe<{ table_schema: string; column_name: string }[]>(
      `SELECT table_schema, column_name FROM information_schema.columns WHERE table_name = 'active_offers' ORDER BY table_schema, ordinal_position`
    );

    const searchPathRows = await prisma.$queryRawUnsafe<{ search_path: string }[]>(`SHOW search_path`);

    let directCreateResult: string;
    try {
      await prisma.$transaction(async (tx: any) => {
        await tx.activeOffer.create({
          data: {
            name: '__debug_probe__',
            source: 'INTERNAL_CLIENTS',
            createdById: user.id,
          },
        });
        throw new Error('__ROLLBACK__');
      });
      directCreateResult = 'unexpected: commit succeeded';
    } catch (e: any) {
      directCreateResult = e.message === '__ROLLBACK__' ? 'OK (rolled back)' : `FAILED: ${e.message}`;
    }

    let dbHost = 'unknown';
    try {
      dbHost = new URL(process.env.DATABASE_URL || '').host;
    } catch {}

    const byschema: Record<string, string[]> = {};
    for (const c of columns) {
      byschema[c.table_schema] = byschema[c.table_schema] || [];
      byschema[c.table_schema].push(c.column_name);
    }

    return NextResponse.json({
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      dbHost,
      searchPath: searchPathRows[0]?.search_path,
      activeOffersColumnsBySchema: byschema,
      directCreateResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
