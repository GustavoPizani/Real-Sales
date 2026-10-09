import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET — lista notificações do usuário logado
export async function GET() {
  const user = await getUserFromToken()
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

// DELETE — apaga todas as notificações do usuário logado ("Limpar tudo").
export async function DELETE() {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { count } = await prisma.notification.deleteMany({ where: { userId: user.id } })
  return NextResponse.json({ success: true, deleted: count })
}

// PATCH — marca como lida(s). Com { id } no corpo, só aquela; sem corpo, todas.
export async function PATCH(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : null

  // userId no filtro garante que ninguém marca notificação de outra pessoa.
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false, ...(id && { id }) },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
