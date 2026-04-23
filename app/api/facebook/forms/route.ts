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

  // Try page access token first; fall back to user token for Business Manager pages
  const tokensToTry = [
    connection.pageAccessToken,
    ...(connection.userAccessToken ? [connection.userAccessToken] : []),
  ]

  let lastError = ''
  let tokenIndex = 0
  for (const token of tokensToTry) {
    const label = tokenIndex === 0 ? 'page_token' : 'user_token'
    tokenIndex++
    try {
      const data = await graphGet<{ data: FbForm[] }>(
        `/${pageId}/leadgen_forms`,
        token,
        { fields: 'id,name,status', limit: '100' }
      )
      return NextResponse.json({ forms: data.data ?? [] })
    } catch (err: any) {
      lastError = err.message
      console.error(`[FB_FORMS] pageId=${pageId} token=${label} error="${err.message}"`)
    }
  }

  // Debug: check what permissions the user token has
  if (tokensToTry[1]) {
    try {
      const debug = await graphGet<any>('/me/permissions', tokensToTry[1])
      console.error('[FB_FORMS] user token permissions:', JSON.stringify(debug?.data?.map((p: any) => `${p.permission}:${p.status}`)))
    } catch {}
  }

  return NextResponse.json({ error: lastError }, { status: 500 })
}
