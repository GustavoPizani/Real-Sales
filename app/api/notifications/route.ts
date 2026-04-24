import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET — lista notificações do usuário logado
export async function GET() {
  const token = cookies().get('authToken')?.value
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH — marca todas como lidas
export async function PATCH() {
  const token = cookies().get('authToken')?.value
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
