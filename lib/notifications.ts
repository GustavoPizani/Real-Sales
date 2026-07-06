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
  const pushTasks: Promise<void>[] = []

  // Push para o corretor
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

  // Push para admins/marketing da mesma conta
  if (accountId) {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['MARKETING_ADMIN', 'DIRECTOR'] },
        // O admin raiz da conta tem accountId nulo (seu próprio id É a conta) —
        // por isso precisa do OR com id, senão ele nunca aparece na lista.
        OR: [{ id: accountId }, { accountId }],
      },
      select: { id: true },
    })

    for (const admin of admins) {
      if (admin.id === brokerId) continue
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
  }

  await Promise.allSettled(pushTasks)
}

export async function notifyNewTask({
  taskTitle,
  clientName,
  userId,
  clientId,
  dateTime,
}: {
  taskTitle: string
  clientName: string
  userId: string
  clientId: string
  dateTime: string
}) {
  const formattedDate = new Date(dateTime).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })

  await createNotification(
    userId,
    '📋 Nova tarefa criada',
    `${taskTitle} — ${clientName} · ${formattedDate}`,
    'TASK',
    { clientId, clientName }
  )

  await sendWebPush(
    userId,
    '📋 Nova tarefa',
    `${taskTitle} — ${clientName} · ${formattedDate}`,
    { clientId, clientName }
  )
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

  if (!vapidPublic || !vapidPrivate || !vapidEmail) {
    console.error('[PUSH] Chaves VAPID não configuradas (VAPID_PRIVATE_KEY / VAPID_EMAIL ausentes)')
    return
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) {
    console.warn('[PUSH] Nenhuma assinatura encontrada para userId:', userId)
    return
  }

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
