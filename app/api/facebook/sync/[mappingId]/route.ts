import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { graphGet, extractLeadFields, type FbLead } from '@/lib/facebook-graph'

export async function POST(
  _: NextRequest,
  { params }: { params: { mappingId: string } }
) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const mapping = await prisma.facebookFormMapping.findUnique({
    where: { id: params.mappingId },
    include: { connection: true },
  })
  if (!mapping)
    return NextResponse.json({ error: 'Mapeamento não encontrado' }, { status: 404 })

  const brokerId = mapping.defaultBrokerId ?? user.id
  let cursor: string | undefined
  let imported = 0
  let skipped = 0

  do {
    const queryParams: Record<string, string> = {
      fields: 'id,created_time,field_data',
      limit: '100',
    }
    if (cursor) queryParams['after'] = cursor

    const data = await graphGet<{
      data: FbLead[]
      paging?: { cursors?: { after?: string }; next?: string }
    }>(`/${mapping.formId}/leads`, mapping.connection.pageAccessToken, queryParams)

    for (const lead of data.data ?? []) {
      const result = await processLead(lead, mapping.formId, brokerId, mapping)
      if (result === 'created') imported++
      else skipped++
    }

    cursor = data.paging?.next ? data.paging?.cursors?.after : undefined
  } while (cursor)

  await prisma.facebookFormMapping.update({
    where: { id: params.mappingId },
    data: { lastSyncedAt: new Date(), leadCount: { increment: imported } },
  })

  return NextResponse.json({ imported, skipped })
}

async function processLead(
  lead: FbLead,
  formId: string,
  brokerId: string,
  mapping: any
): Promise<'created' | 'skipped'> {
  const existing = await prisma.client.findUnique({
    where: { facebookLeadId: lead.id },
  })
  if (existing) return 'skipped'

  // Build field values map
  const fieldValues: Record<string, string> = {}
  for (const f of lead.field_data ?? []) {
    fieldValues[f.name] = f.values[0] ?? ''
  }

  // Apply custom field mappings
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

  if (!fullName) {
    const auto = extractLeadFields(lead)
    fullName = auto.fullName
    if (!email) email = auto.email
    if (!phone) phone = auto.phone
  }

  const formResponses: Record<string, string> = { ...fieldValues }

  // Check email dedup
  if (email) {
    const byEmail = await prisma.client.findUnique({ where: { email } })
    if (byEmail) return 'skipped'
  }

  await prisma.client.create({
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
      funnelId: mapping.funnelId,
      funnelStageId: mapping.funnelStageId,
      propertyOfInterestId: mapping.propertyId ?? undefined,
    },
  })

  return 'created'
}
