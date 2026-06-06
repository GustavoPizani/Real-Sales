import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const accountId = user.accountId ?? user.id
  const broadcasts = await prisma.whatsappBroadcast.findMany({
    where: { accountId },
    include: {
      _count: { select: { contacts: true } },
      contacts: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = broadcasts.map(b => {
    const sent = b.contacts.filter(c => c.status === 'SENT').length
    const failed = b.contacts.filter(c => c.status === 'FAILED' || c.status === 'INVALID').length
    const pending = b.contacts.filter(c => c.status === 'PENDING').length
    return {
      id: b.id, name: b.name, status: b.status,
      messageTemplate: b.messageTemplate,
      limitPerRun: b.limitPerRun, startHour: b.startHour, endHour: b.endHour,
      delayMin: b.delayMin, delayMax: b.delayMax,
      aiEnabled: b.aiEnabled, aiSystemPrompt: b.aiSystemPrompt,
      lastRunAt: b.lastRunAt, createdAt: b.createdAt,
      stats: { total: b._count.contacts, sent, failed, pending },
    }
  })

  return NextResponse.json({ broadcasts: result })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { name, messageTemplate, limitPerRun, startHour, endHour, delayMin, delayMax, aiEnabled, aiSystemPrompt } = body

  if (!name || !messageTemplate) {
    return NextResponse.json({ error: 'Nome e mensagem são obrigatórios' }, { status: 400 })
  }

  const accountId = user.accountId ?? user.id
  const broadcast = await prisma.whatsappBroadcast.create({
    data: {
      accountId,
      name,
      messageTemplate,
      limitPerRun: limitPerRun ?? 15,
      startHour: startHour ?? 9,
      endHour: endHour ?? 18,
      delayMin: delayMin ?? 60,
      delayMax: delayMax ?? 190,
      aiEnabled: aiEnabled ?? false,
      aiSystemPrompt: aiEnabled ? (aiSystemPrompt ?? null) : null,
    },
  })

  return NextResponse.json(broadcast, { status: 201 })
}
