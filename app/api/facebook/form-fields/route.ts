import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { graphGet } from '@/lib/facebook-graph'

export const dynamic = 'force-dynamic'

interface FbQuestion {
  type: string
  label: string
  key: string
  options?: { value: string; key: string }[]
}

export async function GET(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const formId = searchParams.get('formId')
  const pageId = searchParams.get('pageId')

  if (!formId || !pageId)
    return NextResponse.json({ error: 'formId e pageId obrigatórios' }, { status: 400 })

  const accountId =
    (await prisma.user.findUnique({ where: { id: user.id }, select: { accountId: true } }))
      ?.accountId ?? user.id

  const connection = await prisma.facebookConnection.findFirst({
    where: { accountId, pageId, isActive: true },
  })
  if (!connection)
    return NextResponse.json({ error: 'Página não conectada' }, { status: 404 })

  const tokens = [
    connection.pageAccessToken,
    ...(connection.userAccessToken ? [connection.userAccessToken] : []),
  ]

  let lastError = ''
  for (const token of tokens) {
    try {
      const data = await graphGet<{ questions: FbQuestion[] }>(
        `/${formId}`,
        token,
        { fields: 'questions' }
      )
      return NextResponse.json({ questions: data.questions ?? [] })
    } catch (err: any) {
      lastError = err.message
    }
  }

  return NextResponse.json({ error: lastError }, { status: 500 })
}
