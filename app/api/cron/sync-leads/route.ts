import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncMapping } from '@/lib/lead-ingestion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos — suficiente para todos os mapeamentos

export async function GET(request: NextRequest) {
  // Vercel Cron envia Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  console.log('[CRON_SYNC] Iniciando sincronização automática de leads do Facebook')

  const mappings = await prisma.facebookFormMapping.findMany({
    where: { isActive: true },
    include: { connection: true },
  })

  if (mappings.length === 0) {
    console.log('[CRON_SYNC] Nenhum mapeamento ativo encontrado')
    return NextResponse.json({ message: 'Nenhum mapeamento ativo', mappings: 0 })
  }

  const results: Array<{
    mappingId: string
    formName: string
    imported: number
    skipped: number
    errors: number
    error?: string
  }> = []

  for (const mapping of mappings) {
    try {
      const result = await syncMapping(mapping)
      results.push({ mappingId: mapping.id, formName: mapping.formName, ...result })

      if (result.imported > 0) {
        console.log(`[CRON_SYNC] ${mapping.formName}: ${result.imported} leads importados`)
      }
    } catch (err: any) {
      console.error(`[CRON_SYNC] Erro ao sincronizar "${mapping.formName}":`, err.message)
      results.push({
        mappingId: mapping.id,
        formName: mapping.formName,
        imported: 0,
        skipped: 0,
        errors: 1,
        error: err.message,
      })
    }
  }

  const totalImported = results.reduce((s, r) => s + r.imported, 0)
  const durationMs = Date.now() - startedAt

  console.log(`[CRON_SYNC] Concluído em ${durationMs}ms — ${totalImported} leads importados de ${mappings.length} mapeamentos`)

  return NextResponse.json({
    ok: true,
    durationMs,
    totalImported,
    mappings: results,
  })
}
