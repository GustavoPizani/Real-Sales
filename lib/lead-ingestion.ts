import { prisma } from './prisma'
import { graphGet, extractLeadFields, type FbLead } from './facebook-graph'
import { notifyNewLead } from './notifications'
import { sendSlackLeadNotification } from './slack'

export interface IngestResult {
  status: 'created' | 'skipped' | 'error'
  reason?: string
}

function formatDateBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0')
  const mo = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${d}/${mo}/${y} às ${h}:${min}`
}

export async function ingestLead(
  lead: FbLead,
  mapping: any
): Promise<IngestResult> {
  // Dedup pelo ID do lead do Facebook
  const existing = await prisma.client.findUnique({
    where: { facebookLeadId: lead.id },
  })
  if (existing) return { status: 'skipped', reason: 'duplicate_lead_id' }

  // Monta mapa de campos do formulário
  const fieldValues: Record<string, string> = {}
  for (const f of lead.field_data ?? []) {
    fieldValues[f.name] = f.values[0] ?? ''
  }

  // Aplica mapeamentos customizados configurados pelo usuário
  const customMappings: Record<string, string> = (mapping.fieldMappings as any) ?? {}
  let fullName = ''
  let email: string | null = null
  let phone: string | null = null

  for (const [fbKey, value] of Object.entries(fieldValues)) {
    const target = customMappings[fbKey]
    if (target === 'fullName') fullName = value
    else if (target === 'email') email = value
    else if (target === 'phone') phone = value
  }

  // Fallback para detecção automática de campos padrão do Facebook
  if (!fullName) {
    const auto = extractLeadFields(lead)
    fullName = auto.fullName
    if (!email) email = auto.email
    if (!phone) phone = auto.phone
  }

  const formResponses: Record<string, string> = { ...fieldValues }
  const leadDate = lead.created_time ? new Date(lead.created_time) : new Date()
  const campaign = `Facebook Lead Ads - ${mapping.formName}`

  // Dedup por e-mail — registra novo cadastro no histórico do cliente existente
  if (email) {
    const byEmail = await prisma.client.findUnique({ where: { email } })
    if (byEmail) {
      if (!byEmail.facebookLeadId) {
        await prisma.client.update({
          where: { id: byEmail.id },
          data: { facebookLeadId: lead.id, formResponses },
        })
      }
      if (byEmail.brokerId) {
        await prisma.note.create({
          data: {
            content: `🔄 Novo cadastro no formulário (e-mail já existente)\nCampanha: ${campaign}\nData: ${formatDateBR(leadDate)}`,
            authorId: byEmail.brokerId,
            clientId: byEmail.id,
          },
        }).catch(() => null)
      }
      return { status: 'skipped', reason: 'duplicate_email' }
    }
  }

  // Dedup por telefone — registra novo cadastro no histórico do cliente existente
  if (phone) {
    const byPhone = await prisma.client.findFirst({ where: { phone } })
    if (byPhone) {
      if (byPhone.brokerId) {
        await prisma.note.create({
          data: {
            content: `🔄 Novo cadastro no formulário (telefone já existente)\nCampanha: ${campaign}\nData: ${formatDateBR(leadDate)}`,
            authorId: byPhone.brokerId,
            clientId: byPhone.id,
          },
        }).catch(() => null)
      }
      return { status: 'skipped', reason: 'duplicate_phone' }
    }
  }

  // Determina corretor — roleta ou padrão do mapeamento
  let brokerId: string | null = mapping.defaultBrokerId ?? null

  if (!brokerId && mapping.roletaId) {
    const rouletteUsers = await prisma.leadRouletteUser.findMany({
      where: { rouletteId: mapping.roletaId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { lastAssignedAt: 'asc' },
    })

    const activeUser = rouletteUsers[0]
    if (activeUser) {
      brokerId = activeUser.userId
      await prisma.leadRouletteUser.update({
        where: { id: activeUser.id },
        data: { lastAssignedAt: new Date() },
      })
    }
  }

  if (!brokerId) {
    console.error(`[LEAD_INGEST] Nenhum corretor disponível para o mapeamento ${mapping.id}`)
    return { status: 'error', reason: 'no_broker' }
  }

  const client = await prisma.client.create({
    data: {
      fullName,
      email: email ?? undefined,
      phone: phone ?? undefined,
      facebookLeadId: lead.id,
      formResponses,
      campaignSource: campaign,
      createdAt: leadDate,
      brokerId,
      createdById: brokerId,
      funnelId: mapping.funnelId!,
      funnelStageId: mapping.funnelStageId!,
      propertyOfInterestId: mapping.propertyId ?? undefined,
    },
  })

  // Log de origem no histórico (sempre criado para novos leads)
  await prisma.note.create({
    data: {
      content: `📋 Cadastro via Facebook Lead Ads\nFormulário: ${mapping.formName}\nData: ${formatDateBR(leadDate)}`,
      authorId: brokerId,
      clientId: client.id,
    },
  })

  await prisma.facebookFormMapping.update({
    where: { id: mapping.id },
    data: { leadCount: { increment: 1 }, lastSyncedAt: new Date() },
  })

  const broker = await prisma.user.findUnique({
    where: { id: brokerId },
    select: { name: true, accountId: true },
  })

  notifyNewLead({
    clientId: client.id,
    clientName: fullName,
    brokerId,
    brokerName: broker?.name ?? 'Corretor',
    campaignSource: campaign,
    accountId: broker?.accountId,
  }).catch(err => console.error('[NOTIFY] Falha ao enviar push para lead', client.id, ':', err?.message ?? err))

  sendSlackLeadNotification({
    clientId: client.id,
    clientName: fullName,
    phone,
    email,
    brokerName: broker?.name ?? 'Corretor',
    campaignSource: campaign,
  })

  console.log(`[LEAD_INGEST] Cliente criado: ${client.id} (lead FB ${lead.id})`)
  return { status: 'created' }
}

/** Sincroniza um mapeamento buscando leads mais novos que lastSyncedAt.
 *  Usa paginação cursor com early-stop (leads mais antigos que a janela) em vez de
 *  server-side filtering, que não é suportado de forma confiável pelo FB Graph API. */
export async function syncMapping(mapping: any): Promise<{ imported: number; skipped: number; errors: number }> {
  const sinceMs = mapping.lastSyncedAt
    ? new Date(mapping.lastSyncedAt).getTime() - 3_600_000  // 1h overlap
    : Date.now() - 7 * 24 * 60 * 60 * 1000                  // últimos 7 dias na 1ª sync

  let afterCursor: string | undefined
  let imported = 0
  let skipped = 0
  let errors = 0

  for (;;) {
    const queryParams: Record<string, string> = {
      fields: 'id,created_time,field_data',
      limit: '100',
    }
    if (afterCursor) queryParams['after'] = afterCursor

    const data = await graphGet<{
      data: FbLead[]
      paging?: { cursors?: { after?: string }; next?: string }
    }>(`/${mapping.formId}/leads`, mapping.connection.pageAccessToken, queryParams)

    const leads = data.data ?? []
    let stopPagination = false

    for (const lead of leads) {
      const leadMs = lead.created_time ? new Date(lead.created_time).getTime() : 0
      // FB retorna leads do mais novo para o mais antigo; para quando saímos da janela
      if (leadMs > 0 && leadMs < sinceMs) {
        stopPagination = true
        break
      }
      const result = await ingestLead(lead, mapping)
      if (result.status === 'created') imported++
      else if (result.status === 'skipped') skipped++
      else errors++
    }

    const nextCursor = data.paging?.cursors?.after
    if (stopPagination || !data.paging?.next || !nextCursor) break
    afterCursor = nextCursor
  }

  // Marca o momento da sync para que a próxima itere apenas leads novos
  await prisma.facebookFormMapping.update({
    where: { id: mapping.id },
    data: { lastSyncedAt: new Date() },
  })

  return { imported, skipped, errors }
}
