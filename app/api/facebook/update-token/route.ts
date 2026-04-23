import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { userAccessToken } = await request.json()
  if (!userAccessToken) return NextResponse.json({ error: 'userAccessToken obrigatório' }, { status: 400 })

  const accountId =
    (await prisma.user.findUnique({ where: { id: user.id }, select: { accountId: true } }))
      ?.accountId ?? user.id

  const result = await prisma.facebookConnection.updateMany({
    where: { accountId },
    data: { userAccessToken },
  })

  return NextResponse.json({ updated: result.count })
}
