import { NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWebPush } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL

  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } })

  const diagnostics = {
    vapidPublicSet: !!vapidPublic,
    vapidPrivateSet: !!vapidPrivate,
    vapidEmailSet: !!vapidEmail,
    subscriptionCount: subs.length,
    endpoints: subs.map(s => s.endpoint.slice(0, 50) + '...'),
  }

  if (!vapidPublic || !vapidPrivate || !vapidEmail) {
    return NextResponse.json({
      ok: false,
      reason: 'Chaves VAPID não configuradas no servidor (Vercel env vars).',
      diagnostics,
    })
  }

  if (subs.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: 'Nenhuma assinatura push salva. Clique em "Ativar Notificações" neste dispositivo.',
      diagnostics,
    })
  }

  try {
    await sendWebPush(user.id, '✅ Teste Real Sales', 'Push funcionando! Leads serão notificados aqui.', {
      clientId: undefined,
    })
    return NextResponse.json({ ok: true, diagnostics })
  } catch (err: any) {
    return NextResponse.json({ ok: false, reason: err.message, diagnostics })
  }
}
