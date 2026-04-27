import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Retorna todos os usuários da conta com seus slackMemberId
export async function GET() {
  const user = await getUserFromToken()
  if (!user || !['MARKETING_ADMIN', 'DIRECTOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: { accountId: user.accountId },
    select: { id: true, name: true, email: true, role: true, slackMemberId: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ users })
}

// Atualiza o slackMemberId de um usuário
export async function PATCH(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user || !['MARKETING_ADMIN', 'DIRECTOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { userId, slackMemberId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    data: { slackMemberId: slackMemberId || null },
  })

  return NextResponse.json({ ok: true })
}
