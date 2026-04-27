export async function sendSlackLeadNotification({
  clientId,
  clientName,
  phone,
  email,
  brokerName,
  campaignSource,
}: {
  clientId: string
  clientName: string
  phone?: string | null
  email?: string | null
  brokerName: string
  campaignSource?: string | null
}) {
  const webhookUrl = process.env.SLACK_LEAD_WEBHOOK_URL
  if (!webhookUrl) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://real-sales.vercel.app'
  const clientUrl = `${appUrl}/client/${clientId}`

  const fields = []

  if (campaignSource) {
    fields.push({ type: 'mrkdwn', text: `*Campanha:*\n${campaignSource}` })
  }
  fields.push({ type: 'mrkdwn', text: `*Corretor:*\n${brokerName}` })
  if (phone) fields.push({ type: 'mrkdwn', text: `*Telefone:*\n${phone}` })
  if (email) fields.push({ type: 'mrkdwn', text: `*E-mail:*\n${email}` })

  const body = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🔔 Novo lead — ${clientName}`, emoji: true },
      },
      {
        type: 'section',
        fields,
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Ver no CRM →', emoji: true },
            url: clientUrl,
            style: 'primary',
          },
        ],
      },
    ],
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(err => console.error('[SLACK] Falha ao enviar notificação:', err?.message ?? err))
}
