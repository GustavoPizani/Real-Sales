import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Upload contacts via CSV text or JSON array
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { contacts } = body as { contacts: { name?: string; phone: string }[] }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: 'Lista de contatos inválida' }, { status: 400 })
  }

  // Normalize phones
  const normalized = contacts.map(c => {
    let phone = c.phone.toString().replace(/\D/g, '')
    if (phone.length <= 11) phone = '55' + phone
    return { broadcastId: params.id, name: c.name ?? null, phone }
  })

  // Upsert — skip duplicates for this broadcast
  const existing = await prisma.whatsappBroadcastContact.findMany({
    where: { broadcastId: params.id },
    select: { phone: true },
  })
  const existingPhones = new Set(existing.map(e => e.phone))
  const newContacts = normalized.filter(c => !existingPhones.has(c.phone))

  await prisma.whatsappBroadcastContact.createMany({ data: newContacts })

  return NextResponse.json({ added: newContacts.length, skipped: normalized.length - newContacts.length })
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contacts = await prisma.whatsappBroadcastContact.findMany({
    where: { broadcastId: params.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ contacts })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.whatsappBroadcastContact.deleteMany({ where: { broadcastId: params.id } })
  return NextResponse.json({ ok: true })
}
