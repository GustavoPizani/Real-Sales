import { prisma } from './prisma'
import { graphGet, extractLeadFields, type FbLead } from './facebook-graph'
import { notifyNewLead } from './notifications'

export interface IngestResult {
  status: 'created' | 'skipped' | 'error'
  reason?: string
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
  const observationParts: string[] = []

  for (const [fbKey, value] of Object.entries(fieldValues)) {
    const target = customMappings[fbKey]
    if (target === 'fullName') fullName = value
    else if (target === 'email') email = value
    else if (target === 'phone') phone = value
    else if (target === 'ignore') continue
    else {
      const label = fbKey.replace(/_/g, ' ')
      observationParts.push(`${label}: ${value}`)
    }
  }

  // Fallback para detecção automática de campos padrão do Facebook
  if (!fullName) {
    const auto = extractLeadFields(lead)
    fullName = auto.fullName
    if (!email) email = auto.email
    if (!phone) phone = auto.phone
  }

  const formResponses: Record<string, string> = { ...fieldValues }

  // Dedup por e-mail
  if (email) {
    const byEmail = await prisma.client.findUnique({ where: { email } })
    if (byEmail) {
      if (!byEmail.facebookLeadId) {
        await prisma.client.update({
          where: { id: byEmail.id },
          data: { facebookLeadId: lead.id, formResponses },
        })
      }
      return { status: 'skipped', reason: 'duplicate_email' }
    }
  }

  // Determina corretor — roleta ou padrão do mapeamento
  let brokerId: string | null = mapping.defaultBrokerId ?? null

  if (!brokerId && mapping.roletaId) {
    // Busca o próximo usuário na roleta (round-robin por última atribuição)
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
      campaignSource: `Facebook Lead Ads - ${mapping.formName}`,
      createdAt: lead.created_time ? new Date(lead.created_time) : undefined,
      brokerId,
      createdById: brokerId,
      funnelId: mapping.funnelId!,
      funnelStageId: mapping.funnelStageId!,
      propertyOfInterestId: mapping.propertyId ?? undefined,
    },
  })

  if (observationParts.length > 0) {
    await prisma.note.create({
      data: {
        content: `📋 Observações do formulário "${mapping.formName}":\n\n${observationParts.join('\n')}`,
        authorId: brokerId,
        clientId: client.id,
      },
    })
  }

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
    campaignSource: `Facebook Lead Ads - ${mapping.formName}`,
    accountId: broker?.accountId,
  }).catch(() => null)

  console.log(`[LEAD_INGEST] Cliente criado: ${client.id} (lead FB ${lead.id})`)
  return { status: 'created' }
}

/** Sincroniza um mapeamento buscando apenas leads mais novos que lastSyncedAt */
export async function syncMapping(mapping: any): Promise<{ imported: number; skipped: number; errors: number }> {
  const since = mapping.lastSyncedAt
    ? Math.floor(new Date(mapping.lastSyncedAt).getTime() / 1000) - 3600 // 1h de overlap
    : Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)         // últimos 7 dias se nunca sincronizou

  let cursor: string | undefined
  let imported = 0
  let skipped = 0
  let errors = 0
  let hasMore = true

  while (hasMore) {
    const queryParams: Record<string, string> = {
      fields: 'id,created_time,field_data',
      limit: '100',
      filtering: JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: since }]),
    }
    if (cursor) queryParams['after'] = cursor

    const data = await graphGet<{
      data: FbLead[]
      paging?: { cursors?: { after?: string }; next?: string }
    }>(`/${mapping.formId}/leads`, mapping.connection.pageAccessToken, queryParams)

    for (const lead of data.data ?? []) {
      const result = await ingestLead(lead, mapping)
      if (result.status === 'created') imported++
      else if (result.status === 'skipped') skipped++
      else errors++
    }

    cursor = data.paging?.next ? data.paging?.cursors?.after : undefined
    hasMore = !!cursor
  }

  return { imported, skipped, errors }
}
