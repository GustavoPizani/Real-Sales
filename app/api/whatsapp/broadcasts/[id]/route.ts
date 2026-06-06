import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { name, messageTemplate, limitPerRun, startHour, endHour, delayMin, delayMax, status, aiEnabled, aiSystemPrompt } = body

  const broadcast = await prisma.whatsappBroadcast.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(messageTemplate !== undefined && { messageTemplate }),
      ...(limitPerRun !== undefined && { limitPerRun }),
      ...(startHour !== undefined && { startHour }),
      ...(endHour !== undefined && { endHour }),
      ...(delayMin !== undefined && { delayMin }),
      ...(delayMax !== undefined && { delayMax }),
      ...(status !== undefined && { status }),
      ...(aiEnabled !== undefined && { aiEnabled }),
      ...(aiEnabled !== undefined && { aiSystemPrompt: aiEnabled ? (aiSystemPrompt ?? null) : null }),
    },
  })

  return NextResponse.json(broadcast)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.whatsappBroadcast.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
