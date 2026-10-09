import { NextRequest, NextResponse } from 'next/server'
import { dateStr, syncMetaForUser, usersWithMetaToken, type MetaSyncResult } from '@/lib/meta-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Rotina diária: traz as métricas de ontem e anteontem de todos os usuários com token do Meta. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    const qs = request.nextUrl.searchParams.get('secret')
    if (auth !== `Bearer ${cronSecret}` && qs !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startedAt = Date.now()
  console.log('[META_SYNC] Iniciando sincronização de métricas Meta Ads')

  // Ontem + anteontem, para pegar o que o Meta reporta com atraso
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const since = dateStr(twoDaysAgo)
  const until = dateStr(yesterday)

  const userIds = await usersWithMetaToken()
  if (userIds.length === 0) {
    return NextResponse.json({ message: 'Nenhum usuário com META_ACCESS_TOKEN configurado', users: 0 })
  }

  const results: MetaSyncResult[] = []
  for (const userId of userIds) {
    const result = await syncMetaForUser(userId, since, until)
    results.push(result)
    console.log(`[META_SYNC] user=${userId}: ${result.imported} métricas salvas, ${result.errors.length} erros`)
  }

  const totalImported = results.reduce((s, r) => s + r.imported, 0)
  const durationMs = Date.now() - startedAt
  console.log(`[META_SYNC] Concluído em ${durationMs}ms — ${totalImported} métricas no total`)

  return NextResponse.json({ ok: true, durationMs, since, until, totalImported, results })
}
