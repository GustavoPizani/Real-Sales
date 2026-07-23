import { prisma } from './prisma'
import { createNotification, sendWebPush } from './notifications'
import { ClientOverallStatus, QualificationStatus, type Client } from '@prisma/client'

// Procura um cliente já cadastrado com o mesmo e-mail ou telefone.
// Usado por qualquer entrada de lead novo (LP, formulário do Facebook, etc.)
// para não duplicar cadastro nem furar a fila da roleta de quem já está em atendimento.
export async function findDuplicateClient(email: string | null | undefined, phone: string | null | undefined): Promise<Client | null> {
  if (email) {
    const byEmail = await prisma.client.findUnique({ where: { email } })
    if (byEmail) return byEmail
  }
  if (phone) {
    const byPhone = await prisma.client.findFirst({ where: { phone } })
    if (byPhone) return byPhone
  }
  return null
}

// Lead ativo com corretor: NÃO deve furar a roleta nem trocar de corretor —
// só registra o recadastro no histórico e avisa quem já está atendendo.
export async function registerRecadastro(client: Client, source: string): Promise<void> {
  const isActiveWithBroker = client.overallStatus === ClientOverallStatus.ACTIVE && !!client.brokerId

  await prisma.note.create({
    data: {
      content: `🔄 Recadastro: ${client.fullName} preencheu o formulário novamente.\nOrigem: ${source}`,
      authorId: client.brokerId ?? undefined,
      clientId: client.id,
    },
  }).catch(() => null)

  if (!isActiveWithBroker || !client.brokerId) return

  const title = '🔄 Lead recadastrado'
  const body = `${client.fullName} preencheu o formulário de novo — ${source}`

  await Promise.allSettled([
    createNotification(client.brokerId, title, body, 'RECADASTRO', { clientId: client.id, clientName: client.fullName }),
    sendWebPush(client.brokerId, title, body, { clientId: client.id, url: `/client/${client.id}` }),
  ])
}

// Lead perdido que recadastrou: volta a disputar a distribuição normal (roleta ou
// atribuição direta) em vez de ficar preso ao corretor antigo, e reabre no funil de entrada.
export async function reopenLostClient(
  client: Client,
  opts: { brokerId: string; roletaId: string | null; funnelId: string; funnelStageId: string; source: string }
): Promise<Client> {
  const previousBrokerId = client.brokerId

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: {
      overallStatus: ClientOverallStatus.ACTIVE,
      qualificationStatus: QualificationStatus.WAITING,
      brokerId: opts.brokerId,
      roletaId: opts.roletaId,
      funnelId: opts.funnelId,
      funnelStageId: opts.funnelStageId,
      campaignSource: opts.source,
    },
  })

  await prisma.note.create({
    data: {
      content: `🔁 Lead recuperado: estava marcado como perdido e recadastrou. Voltou pra roleta e foi redistribuído.\nOrigem: ${opts.source}`,
      authorId: opts.brokerId,
      clientId: client.id,
    },
  }).catch(() => null)

  const title = '🔁 Lead perdido recuperado'
  const body = `${client.fullName} recadastrou depois de ter sido marcado como perdido — ${opts.source}`

  await Promise.allSettled([
    createNotification(opts.brokerId, title, body, 'LEAD_RECOVERED', { clientId: client.id, clientName: client.fullName }),
    sendWebPush(opts.brokerId, title, body, { clientId: client.id, url: `/client/${client.id}` }),
  ])

  return updated
}
