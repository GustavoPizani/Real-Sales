import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { graphGet, extractLeadFields, type FbLead } from '@/lib/facebook-graph'

export const dynamic = 'force-dynamic'

// GET — Webhook verification handshake
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log('[FB_WEBHOOK] Verification successful')
    return new Response(challenge, { status: 200 })
  }

  console.warn('[FB_WEBHOOK] Verification failed — token mismatch')
  return new Response('Forbidden', { status: 403 })
}

// POST — Real-time lead payload
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  // Process asynchronously (fire-and-forget pattern — respond 200 immediately)
  processWebhookPayload(body).catch(err =>
    console.error('[FB_WEBHOOK_PROCESS_ERROR]', err)
  )

  return new Response('EVENT_RECEIVED', { status: 200 })
}

async function processWebhookPayload(body: any) {
  if (!body || body.object !== 'page') return

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const { leadgen_id, form_id } = change.value

      const mapping = await prisma.facebookFormMapping.findUnique({
        where: { formId: String(form_id) },
        include: { connection: true },
      })

      if (!mapping || !mapping.isActive) {
        console.warn(`[FB_WEBHOOK] No active mapping for form ${form_id}`)
        continue
      }

      try {
        const lead = await graphGet<FbLead>(
          `/${leadgen_id}`,
          mapping.connection.pageAccessToken,
          { fields: 'id,created_time,field_data' }
        )

        await ingestLead(lead, mapping)
      } catch (err) {
        console.error(
          `[FB_WEBHOOK] Failed to process lead ${leadgen_id}:`,
          err
        )
      }
    }
  }
}

async function ingestLead(lead: FbLead, mapping: any) {
  // Deduplication by facebookLeadId
  const existing = await prisma.client.findUnique({
    where: { facebookLeadId: lead.id },
  })
  if (existing) {
    console.log(`[FB_WEBHOOK] Lead ${lead.id} already exists — skipping`)
    return
  }

  const { fullName, email, phone } = extractLeadFields(lead)

  // Email dedup
  if (email) {
    const byEmail = await prisma.client.findUnique({ where: { email } })
    if (byEmail) {
      // Update existing client's facebookLeadId if missing
      if (!byEmail.facebookLeadId) {
        await prisma.client.update({
          where: { id: byEmail.id },
          data: { facebookLeadId: lead.id },
        })
      }
      console.log(
        `[FB_WEBHOOK] Matched existing client by email for lead ${lead.id}`
      )
      return
    }
  }

  // Roulette assignment: pick broker from roulette if configured
  let brokerId = mapping.defaultBrokerId
  if (!brokerId && mapping.roletaId) {
    const rouletteUser = await prisma.leadRouletteUser.findFirst({
      where: { rouletteId: mapping.roletaId },
      include: { user: true },
      orderBy: { userId: 'asc' },
    })
    brokerId = rouletteUser?.userId ?? null
  }

  if (!brokerId) {
    console.error(
      `[FB_WEBHOOK] No broker available for mapping ${mapping.id}`
    )
    return
  }

  const client = await prisma.client.create({
    data: {
      fullName,
      email: email ?? undefined,
      phone: phone ?? undefined,
      facebookLeadId: lead.id,
      brokerId,
      createdById: brokerId,
      funnelId: mapping.funnelId!,
      funnelStageId: mapping.funnelStageId!,
      propertyOfInterestId: mapping.propertyId ?? undefined,
    },
  })

  // Add note with raw lead data
  await prisma.note.create({
    data: {
      content: `Lead recebido via Facebook Lead Ads.\nFormulário: ${mapping.formName}\nDados brutos: ${JSON.stringify(lead.field_data, null, 2)}`,
      authorId: brokerId,
      clientId: client.id,
    },
  })

  await prisma.facebookFormMapping.update({
    where: { id: mapping.id },
    data: { leadCount: { increment: 1 } },
  })

  console.log(`[FB_WEBHOOK] Created client ${client.id} from lead ${lead.id}`)
}
