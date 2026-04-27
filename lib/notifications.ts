import { prisma } from './prisma'

export interface NotifData {
  clientId?: string
  clientName?: string
  campaignSource?: string
  brokerName?: string
  [key: string]: string | undefined
}

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  data?: NotifData
) {
  return prisma.notification.create({
    data: { userId, title, body, type, data: data as any },
  })
}

export async function notifyNewLead({
  clientId,
  clientName,
  brokerId,
  brokerName,
  campaignSource,
  accountId,
}: {
  clientId: string
  clientName: string
  brokerId: string
  brokerName: string
  campaignSource?: string | null
  accountId?: string | null
}) {
  const tasks: Promise<any>[] = []

  // Notifica o corretor que recebeu o lead
  tasks.push(
    createNotification(
      brokerId,
      '🔔 Novo lead recebido',
      campaignSource
        ? `${clientName} chegou via ${campaignSource}.`
        : `${clientName} foi atribuído a você.`,
      'new_lead',
      { clientId, clientName, campaignSource: campaignSource ?? undefined, brokerName }
    )
  )

  // Notifica admins/marketing da mesma conta
  if (accountId) {
    const admins = await prisma.user.findMany({
      where: { accountId, role: { in: ['MARKETING_ADMIN', 'DIRECTOR'] } },
      select: { id: true },
    })

    for (const admin of admins) {
      if (admin.id === brokerId) continue
      tasks.push(
        createNotification(
          admin.id,
          '📊 Novo lead distribuído',
          campaignSource
            ? `${clientName} · ${campaignSource} → ${brokerName}`
            : `${clientName} atribuído a ${brokerName}.`,
          'lead_assigned',
          { clientId, clientName, campaignSource: campaignSource ?? undefined, brokerName }
        )
      )
    }
  }

  const results = await Promise.allSettled(tasks)

  // Envia push web para cada notificação criada com sucesso
  const pushTasks: Promise<void>[] = []

  // Push para o corretor
  const brokerNotif = results[0]
  if (brokerNotif.status === 'fulfilled') {
    pushTasks.push(
      sendWebPush(
        brokerId,
        '🔔 Novo lead recebido',
        campaignSource
          ? `${clientName} chegou via ${campaignSource}.`
          : `${clientName} foi atribuído a você.`,
        { clientId, clientName, campaignSource: campaignSource ?? undefined }
      )
    )
  }

  // Push para cada admin (resultados a partir do índice 1)
  if (accountId) {
    const admins = await prisma.user.findMany({
      where: { accountId, role: { in: ['MARKETING_ADMIN', 'DIRECTOR'] } },
      select: { id: true },
    })
    let adminIdx = 1
    for (const admin of admins) {
      if (admin.id === brokerId) continue
      const notifResult = results[adminIdx]
      if (notifResult?.status === 'fulfilled') {
        pushTasks.push(
          sendWebPush(
            admin.id,
            '📊 Novo lead distribuído',
            campaignSource
              ? `${clientName} · ${campaignSource} → ${brokerName}`
              : `${clientName} atribuído a ${brokerName}.`,
            { clientId, clientName, campaignSource: campaignSource ?? undefined, brokerName }
          )
        )
      }
      adminIdx++
    }
  }

  await Promise.allSettled(pushTasks)
}

export async function sendWebPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL

  if (!vapidPublic || !vapidPrivate || !vapidEmail) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  const webpush = await import('web-push')
  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublic, vapidPrivate)
  const payload = JSON.stringify({ title, body, data })

  await Promise.allSettled(
    subs.map(async (sub) => {
      if (!sub.p256dh || !sub.auth) return
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err: any) {
        // Remove assinaturas expiradas/inválidas (410 Gone ou 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null)
        } else {
          console.error('[PUSH] Failed:', err.message)
        }
      }
    })
  )
}
