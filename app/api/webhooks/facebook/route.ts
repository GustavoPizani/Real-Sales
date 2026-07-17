import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { prisma } from '@/lib/prisma'
import { graphGet, type FbLead } from '@/lib/facebook-graph'
import { ingestLead } from '@/lib/lead-ingestion'

export const dynamic = 'force-dynamic'

// GET — Webhook verification handshake
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log('[FB_WEBHOOK] Verification successful')
    return new Response(challenge, { status: 200 })
  }

  console.warn('[FB_WEBHOOK] Verification failed — token mismatch')
  return new Response('Forbidden', { status: 403 })
}

// POST — Real-time lead payload
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  // waitUntil garante que a Vercel mantém a função viva até o processamento terminar
  // mesmo após retornar o 200 (Facebook exige resposta em < 20s)
  waitUntil(
    processWebhookPayload(body).catch(err =>
      console.error('[FB_WEBHOOK_PROCESS_ERROR]', err)
    )
  )

  return new Response('EVENT_RECEIVED', { status: 200 })
}

async function processWebhookPayload(body: any) {
  if (!body || body.object !== 'page') return

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const { leadgen_id, form_id } = change.value

      // Repasse incondicional para o Leadflow (sistema irmão de distribuição de leads via
      // roleta). Roda para TODO evento de leadgen, tenha ou não FacebookFormMapping aqui —
      // isso permite mapear o mesmo formulário do Meta nos dois sistemas ao mesmo tempo. O
      // Leadflow decide sozinho, pela própria tabela dele, se aquele form_id é relevante;
      // nunca bloqueia nem afeta o processamento abaixo.
      forwardToLeadflow({ leadgen_id, form_id }).catch(err =>
        console.error('[FB_WEBHOOK] Falha ao repassar para o Leadflow:', err)
      )

      const mapping = await prisma.facebookFormMapping.findUnique({
        where: { formId: String(form_id) },
        include: { connection: true, property: { select: { title: true } } },
      })

      if (!mapping || !mapping.isActive) {
        console.warn(`[FB_WEBHOOK] Nenhum mapeamento ativo para o formulário ${form_id}`)
        continue
      }

      try {
        const lead = await graphGet<FbLead>(
          `/${leadgen_id}`,
          mapping.connection.pageAccessToken,
          { fields: 'id,created_time,field_data' }
        )

        const result = await ingestLead(lead, mapping)
        console.log(`[FB_WEBHOOK] Lead ${leadgen_id}: ${result.status}`)
      } catch (err) {
        console.error(`[FB_WEBHOOK] Falha ao processar lead ${leadgen_id}:`, err)
      }
    }
  }
}

// Repasse fire-and-forget para o Leadflow (app/api/meta/ingest lá). Nunca lança para fora —
// se LEADFLOW_META_FORWARD_URL não estiver configurada, é um no-op silencioso.
async function forwardToLeadflow(payload: { leadgen_id: string; form_id: string }) {
  const url = process.env.LEADFLOW_META_FORWARD_URL
  if (!url) return

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.LEADFLOW_INTERNAL_SECRET ?? '',
    },
    body: JSON.stringify(payload),
  })
}
