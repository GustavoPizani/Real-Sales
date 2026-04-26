import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { graphGet } from '@/lib/facebook-graph'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const mappingId = request.nextUrl.searchParams.get('mappingId')
  if (!mappingId) return NextResponse.json({ error: 'mappingId obrigatório' }, { status: 400 })

  const mapping = await prisma.facebookFormMapping.findUnique({
    where: { id: mappingId },
    include: { connection: true },
  })

  if (!mapping) return NextResponse.json({ error: 'Mapeamento não encontrado' }, { status: 404 })

  const conn = mapping.connection
  const tokenPreview = conn.pageAccessToken
    ? conn.pageAccessToken.slice(0, 20) + '...'
    : 'AUSENTE'

  try {
    // Testa se o token ainda é válido e o form existe
    const form = await graphGet<{ id: string; name: string }>(
      `/${mapping.formId}?fields=id,name`,
      conn.pageAccessToken
    )
    return NextResponse.json({
      ok: true,
      formId: form.id,
      formName: form.name,
      tokenPreview,
      lastSyncedAt: mapping.lastSyncedAt,
    })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      tokenPreview,
      lastSyncedAt: mapping.lastSyncedAt,
    }, { status: 200 }) // retorna 200 para sempre conseguir ver o erro no browser
  }
}
