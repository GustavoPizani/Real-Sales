import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const WAHA_BASE = process.env.WAHA_BASE_URL ?? 'http://localhost:3000'
const WAHA_KEY  = process.env.WAHA_API_KEY ?? ''

async function checkPhoneExists(phone: string): Promise<boolean> {
  try {
    const res = await fetch(`${WAHA_BASE}/api/contacts/check-exists?phone=${phone}@c.us&session=default`, {
      headers: { 'X-Api-Key': WAHA_KEY, Accept: 'application/json' },
    })
    const data = await res.json()
    return data.numberExists === true
  } catch {
    return false
  }
}

async function sendMessage(phone: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${WAHA_BASE}/api/sendText`, {
      method: 'POST',
      headers: { 'X-Api-Key': WAHA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${phone}@c.us`, text, session: 'default' }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Resolve spintax: {opção1|opção2|opção3} → escolhe uma aleatoriamente
function resolveSpintax(template: string, vars: Record<string, string> = {}): string {
  let text = template.replace(/\{([^{}]+)\}/g, (_, group) => {
    const options = group.split('|')
    return options[Math.floor(Math.random() * options.length)]
  })
  // Replace {{variavel}}
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), v)
  }
  return text
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const broadcast = await prisma.whatsappBroadcast.findUnique({
    where: { id: params.id },
  })
  if (!broadcast) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
  if (broadcast.status === 'FINISHED') {
    return NextResponse.json({ error: 'Campanha já finalizada' }, { status: 400 })
  }

  // Validate time window
  const now = new Date()
  const hour = now.getHours()
  if (hour < broadcast.startHour || hour >= broadcast.endHour) {
    return NextResponse.json({
      error: `Fora do horário permitido (${broadcast.startHour}h–${broadcast.endHour}h)`,
      skipped: true,
    })
  }

  // Get pending contacts up to the limit
  const contacts = await prisma.whatsappBroadcastContact.findMany({
    where: { broadcastId: params.id, status: 'PENDING' },
    take: broadcast.limitPerRun,
    orderBy: { createdAt: 'asc' },
  })

  if (contacts.length === 0) {
    await prisma.whatsappBroadcast.update({
      where: { id: params.id },
      data: { status: 'FINISHED' },
    })
    return NextResponse.json({ message: 'Todos os contatos foram processados. Campanha finalizada.', finished: true })
  }

  const results = { sent: 0, failed: 0, invalid: 0 }

  for (const contact of contacts) {
    // Check if phone is on WhatsApp
    const exists = await checkPhoneExists(contact.phone)
    if (!exists) {
      await prisma.whatsappBroadcastContact.update({
        where: { id: contact.id },
        data: { status: 'INVALID', errorMessage: 'Número não encontrado no WhatsApp' },
      })
      results.invalid++
      continue
    }

    // Resolve message with spintax + variables
    const message = resolveSpintax(broadcast.messageTemplate, {
      nome: contact.name?.split(' ')[0] ?? 'tudo bem',
      nome_completo: contact.name ?? '',
    })

    const ok = await sendMessage(contact.phone, message)
    await prisma.whatsappBroadcastContact.update({
      where: { id: contact.id },
      data: ok
        ? { status: 'SENT', sentAt: new Date() }
        : { status: 'FAILED', errorMessage: 'Falha ao enviar pelo WAHA' },
    })
    ok ? results.sent++ : results.failed++

    // Random delay between messages (except after last one)
    if (contact !== contacts[contacts.length - 1]) {
      const delay = Math.floor(
        Math.random() * (broadcast.delayMax - broadcast.delayMin + 1) + broadcast.delayMin
      ) * 1000
      await sleep(delay)
    }
  }

  await prisma.whatsappBroadcast.update({
    where: { id: params.id },
    data: { lastRunAt: new Date(), status: 'ACTIVE' },
  })

  // Check if all contacts are processed
  const remainingCount = await prisma.whatsappBroadcastContact.count({
    where: { broadcastId: params.id, status: 'PENDING' },
  })
  if (remainingCount === 0) {
    await prisma.whatsappBroadcast.update({
      where: { id: params.id },
      data: { status: 'FINISHED' },
    })
  }

  return NextResponse.json({ ok: true, ...results, remaining: remainingCount })
}
