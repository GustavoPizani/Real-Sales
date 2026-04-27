import { NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL

  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } })

  if (!vapidPublic || !vapidPrivate || !vapidEmail) {
    return NextResponse.json({
      ok: false,
      reason: 'Chaves VAPID não configuradas no servidor.',
      devices: [],
    })
  }

  if (subs.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: 'Nenhuma assinatura salva. Clique em "Ativar Notificações" neste dispositivo.',
      devices: [],
    })
  }

  const webpush = await import('web-push')
  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublic, vapidPrivate)
  const payload = JSON.stringify({
    title: '✅ Teste Real Sales',
    body: 'Push funcionando! Você receberá alertas de novos leads aqui.',
    data: {},
  })

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const label = sub.endpoint.includes('googleapis') ? 'Chrome/Android'
        : sub.endpoint.includes('apple') ? 'Safari/iPhone'
        : sub.endpoint.includes('mozilla') ? 'Firefox'
        : sub.endpoint.slice(8, 40) + '...'
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh!, auth: sub.auth! } },
          payload
        )
        return { device: label, status: 'sent' }
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null)
        }
        return { device: label, status: 'failed', error: err.message, statusCode: err.statusCode }
      }
    })
  )

  const devices = results.map(r => r.status === 'fulfilled' ? r.value : { device: '?', status: 'failed', error: 'promise rejected' })
  const allOk = devices.every(d => d.status === 'sent')

  return NextResponse.json({ ok: allOk, devices })
}
