import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const accountId =
    (
      await prisma.user.findUnique({
        where: { id: user.id },
        select: { accountId: true },
      })
    )?.accountId ?? user.id

  const connections = await prisma.facebookConnection.findMany({
    where: { accountId, isActive: true },
    select: { id: true, pageId: true, pageName: true },
    orderBy: { pageName: 'asc' },
  })

  return NextResponse.json({ pages: connections })
}
