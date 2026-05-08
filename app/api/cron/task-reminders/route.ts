import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWebPush } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TASK_TYPE_LABELS: Record<string, string> = {
  CALL: 'Ligação',
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  VISIT: 'Visita',
  OTHER: 'Tarefa',
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const querySecret = request.nextUrl.searchParams.get('secret')
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()

  // Busca todos os usuários com suas tasks pendentes + janela de lembrete
  const users = await prisma.user.findMany({
    select: { id: true, name: true, taskReminderMinutes: true },
  })

  let notified = 0
  let skipped = 0

  for (const user of users) {
    const windowEnd = new Date(now.getTime() + user.taskReminderMinutes * 60 * 1000)

    // Tasks que vencem dentro da janela do usuário, não concluídas e sem lembrete enviado
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        isCompleted: false,
        reminderSentAt: null,
        dateTime: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: { client: { select: { fullName: true } } },
    })

    for (const task of tasks) {
      const minutesLeft = Math.round((task.dateTime.getTime() - now.getTime()) / 60000)
      const typeLabel = TASK_TYPE_LABELS[task.type] ?? 'Tarefa'
      const timeLabel = minutesLeft <= 1 ? 'agora' : `em ${minutesLeft} min`

      try {
        await sendWebPush(
          user.id,
          `${typeLabel} ${timeLabel} — ${task.client.fullName}`,
          task.title,
          { taskId: task.id, clientId: task.clientId, url: `/client/${task.clientId}` }
        )

        await prisma.task.update({
          where: { id: task.id },
          data: { reminderSentAt: now },
        })

        notified++
      } catch (err: any) {
        console.error(`[TASK_REMINDER] Erro ao notificar task ${task.id}:`, err.message)
        skipped++
      }
    }
  }

  console.log(`[TASK_REMINDER] ${notified} lembretes enviados, ${skipped} erros`)
  return NextResponse.json({ ok: true, notified, skipped, checkedAt: now.toISOString() })
}
