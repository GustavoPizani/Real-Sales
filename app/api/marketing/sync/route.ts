import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { getUserFromToken } from '@/lib/auth'
import { META_RETENTION_DAYS, syncMetaForUser } from '@/lib/meta-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DAY_MS = 24 * 60 * 60 * 1000
const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/**
 * Botão "Sincronizar" do dashboard de marketing: busca no Meta as métricas do
 * período pedido para o usuário logado. O token é lido no servidor — o
 * navegador só manda as datas.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Apenas o administrador sincroniza as campanhas.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!isDay(body?.since) || !isDay(body?.until) || body.since > body.until) {
      return NextResponse.json({ error: 'Período inválido.' }, { status: 400 })
    }
    const days = (Date.parse(body.until) - Date.parse(body.since)) / DAY_MS + 1
    if (days > META_RETENTION_DAYS) {
      return NextResponse.json({ error: `O período máximo é de ${META_RETENTION_DAYS} dias.` }, { status: 400 })
    }

    const result = await syncMetaForUser(user.id, body.since, body.until)
    return NextResponse.json({ accounts: result.accounts, imported: result.imported, errors: result.errors })
  } catch (error) {
    console.error('Erro ao sincronizar com o Meta:', error)
    return NextResponse.json({ error: 'Erro interno ao sincronizar.' }, { status: 500 })
  }
}
