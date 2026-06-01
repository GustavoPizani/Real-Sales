async function post(url: string, body: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    .catch(err => console.error('[SLACK] fetch error:', err?.message))
}

function buildBlocks({
  clientId,
  clientName,
  phone,
  email,
  brokerName,
  campaignSource,
  appUrl,
  whatsappUrl,
  hasSdrAgent,
}: {
  clientId: string
  clientName: string
  phone?: string | null
  email?: string | null
  brokerName: string
  campaignSource?: string | null
  appUrl: string
  whatsappUrl?: string | null
  hasSdrAgent?: boolean
}) {
  const fields: { type: string; text: string }[] = []
  if (campaignSource) fields.push({ type: 'mrkdwn', text: `*Campanha:*\n${campaignSource}` })
  fields.push({ type: 'mrkdwn', text: `*Corretor:*\n${brokerName}` })
  if (phone) fields.push({ type: 'mrkdwn', text: `*Telefone:*\n${phone}` })
  if (email) fields.push({ type: 'mrkdwn', text: `*E-mail:*\n${email}` })

  const actionButtons: object[] = [
    {
      type: 'button',
      text: { type: 'plain_text', text: 'Ver no CRM →', emoji: true },
      url: `${appUrl}/client/${clientId}`,
      style: 'primary',
    },
  ]

  if (whatsappUrl) {
    actionButtons.push({
      type: 'button',
      text: {
        type: 'plain_text',
        text: hasSdrAgent ? '🤖 Abrir WhatsApp (SDR)' : '💬 Enviar no WhatsApp',
        emoji: true,
      },
      url: whatsappUrl,
    })
  }

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🔔 Novo lead — ${clientName}`, emoji: true },
    },
    { type: 'section', fields },
    { type: 'actions', elements: actionButtons },
  ]
}

function buildWhatsAppUrl({
  phone,
  hasSdrAgent,
  firstMessage,
}: {
  phone?: string | null
  hasSdrAgent: boolean
  firstMessage?: string | null
}): string | null {
  if (!phone) return null

  const raw = phone.replace(/\D/g, '')
  const formatted = raw.startsWith('55') && raw.length >= 12 ? raw : `55${raw}`

  if (hasSdrAgent) {
    // SDR ativo: abre o chat sem mensagem pré-preenchida
    return `https://wa.me/${formatted}`
  }

  // Sem SDR: pré-preenche com a mensagem de primeiro contato configurada
  if (!firstMessage) return `https://wa.me/${formatted}`

  return `https://wa.me/${formatted}?text=${encodeURIComponent(firstMessage)}`
}

export async function sendSlackLeadNotification({
  clientId,
  clientName,
  phone,
  email,
  brokerName,
  brokerSlackMemberId,
  campaignSource,
  hasSdrAgent = false,
  firstMessage,
}: {
  clientId: string
  clientName: string
  phone?: string | null
  email?: string | null
  brokerName: string
  brokerSlackMemberId?: string | null
  campaignSource?: string | null
  hasSdrAgent?: boolean
  firstMessage?: string | null
}) {
  const webhookUrl = process.env.SLACK_LEAD_WEBHOOK_URL
  const botToken = process.env.SLACK_BOT_TOKEN
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    'https://real-sales-ruby.vercel.app'

  const whatsappUrl = buildWhatsAppUrl({ phone, hasSdrAgent, firstMessage })

  const blocks = buildBlocks({
    clientId,
    clientName,
    phone,
    email,
    brokerName,
    campaignSource,
    appUrl,
    whatsappUrl,
    hasSdrAgent,
  })

  if (webhookUrl) {
    await post(webhookUrl, { blocks })
  }

  if (botToken && brokerSlackMemberId) {
    await post('https://slack.com/api/chat.postMessage', {
      channel: brokerSlackMemberId,
      blocks,
      text: `🔔 Novo lead: ${clientName}`,
    }, botToken)
  }
}

export async function sendSlackSDRNotification(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('[SLACK SDR] SLACK_WEBHOOK_URL is not set')
    return
  }

  await post(webhookUrl, {
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: message } }],
  })
}
