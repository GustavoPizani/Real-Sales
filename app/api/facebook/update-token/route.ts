import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { graphGet, type FbPage } from '@/lib/facebook-graph'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { userAccessToken } = await request.json()
  if (!userAccessToken) return NextResponse.json({ error: 'userAccessToken obrigatório' }, { status: 400 })

  const accountId =
    (await prisma.user.findUnique({ where: { id: user.id }, select: { accountId: true } }))
      ?.accountId ?? user.id

  // Fetch fresh page tokens from /me/accounts using the new user token
  let pageTokenMap: Record<string, string> = {}
  try {
    const pages = await graphGet<{ data: FbPage[] }>(
      '/me/accounts?fields=id,name,access_token',
      userAccessToken
    )
    for (const p of pages.data ?? []) {
      if (p.id && p.access_token) pageTokenMap[p.id] = p.access_token
    }
  } catch {}

  // Update each connection with fresh page token + user token
  const connections = await prisma.facebookConnection.findMany({
    where: { accountId },
    select: { id: true, pageId: true },
  })

  let updated = 0
  for (const conn of connections) {
    await prisma.facebookConnection.update({
      where: { id: conn.id },
      data: {
        userAccessToken,
        ...(pageTokenMap[conn.pageId] ? { pageAccessToken: pageTokenMap[conn.pageId] } : {}),
      },
    })
    updated++
  }

  return NextResponse.json({ updated, pagesWithFreshToken: Object.keys(pageTokenMap).length })
}
