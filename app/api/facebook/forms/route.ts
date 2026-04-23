import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { graphGet, type FbForm } from '@/lib/facebook-graph'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const pageId = new URL(request.url).searchParams.get('pageId')
  if (!pageId)
    return NextResponse.json({ error: 'pageId obrigatório' }, { status: 400 })

  const accountId =
    (
      await prisma.user.findUnique({
        where: { id: user.id },
        select: { accountId: true },
      })
    )?.accountId ?? user.id

  const connection = await prisma.facebookConnection.findFirst({
    where: { accountId, pageId, isActive: true },
  })
  if (!connection)
    return NextResponse.json({ error: 'Página não conectada' }, { status: 404 })

  try {
    const data = await graphGet<{ data: FbForm[] }>(
      `/${pageId}/leadgen_forms`,
      connection.pageAccessToken,
      { fields: 'id,name,status', limit: '100' }
    )
    return NextResponse.json({ forms: data.data ?? [] })
  } catch (err: any) {
    console.error('[FB_FORMS] pageId:', pageId, 'error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
