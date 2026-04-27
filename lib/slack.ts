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
}: {
  clientId: string
  clientName: string
  phone?: string | null
  email?: string | null
  brokerName: string
  campaignSource?: string | null
  appUrl: string
}) {
  const fields: { type: string; text: string }[] = []
  if (campaignSource) fields.push({ type: 'mrkdwn', text: `*Campanha:*\n${campaignSource}` })
  fields.push({ type: 'mrkdwn', text: `*Corretor:*\n${brokerName}` })
  if (phone) fields.push({ type: 'mrkdwn', text: `*Telefone:*\n${phone}` })
  if (email) fields.push({ type: 'mrkdwn', text: `*E-mail:*\n${email}` })

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🔔 Novo lead — ${clientName}`, emoji: true },
    },
    { type: 'section', fields },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Ver no CRM →', emoji: true },
          url: `${appUrl}/client/${clientId}`,
          style: 'primary',
        },
      ],
    },
  ]
}

export async function sendSlackLeadNotification({
  clientId,
  clientName,
  phone,
  email,
  brokerName,
  brokerSlackMemberId,
  campaignSource,
}: {
  clientId: string
  clientName: string
  phone?: string | null
  email?: string | null
  brokerName: string
  brokerSlackMemberId?: string | null
  campaignSource?: string | null
}) {
  const webhookUrl = process.env.SLACK_LEAD_WEBHOOK_URL
  const botToken = process.env.SLACK_BOT_TOKEN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://real-sales.vercel.app'

  const blocks = buildBlocks({ clientId, clientName, phone, email, brokerName, campaignSource, appUrl })

  // Envia para o canal geral via Incoming Webhook
  if (webhookUrl) {
    await post(webhookUrl, { blocks })
  }

  // Envia DM para o corretor via Bot API se tiver Member ID e Bot Token
  if (botToken && brokerSlackMemberId) {
    await post('https://slack.com/api/chat.postMessage', {
      channel: brokerSlackMemberId,
      blocks,
      text: `🔔 Novo lead: ${clientName}`,
    }, botToken)
  }
}
