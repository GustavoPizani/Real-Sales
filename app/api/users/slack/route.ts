import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Retorna todos os usuários da conta com seus slackWebhookUrl
export async function GET() {
  const user = await getUserFromToken()
  if (!user || !['MARKETING_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, slackWebhookUrl: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ users })
}

// Atualiza o slackWebhookUrl (canal próprio) de um usuário
export async function PATCH(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user || !['MARKETING_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { userId, slackWebhookUrl } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    data: { slackWebhookUrl: slackWebhookUrl || null },
  })

  return NextResponse.json({ ok: true })
}
