import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const accountId =
    (
      await prisma.user.findUnique({
        where: { id: user.id },
        select: { accountId: true },
      })
    )?.accountId ?? user.id

  const mappings = await prisma.facebookFormMapping.findMany({
    where: { connection: { accountId } },
    include: {
      connection: { select: { pageName: true, pageId: true } },
      property: { select: { id: true, title: true } },
      funnel: { select: { id: true, name: true } },
      funnelStage: { select: { id: true, name: true } },
      defaultBroker: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ mappings })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const {
    connectionId,
    formId,
    formName,
    pageId,
    propertyId,
    roletaId,
    funnelId,
    funnelStageId,
    agencia,
    praca,
    defaultBrokerId,
    syncLeads,
  } = body

  if (!connectionId || !formId || !formName || !funnelId || !funnelStageId) {
    return NextResponse.json(
      {
        error:
          'Campos obrigatórios: connectionId, formId, formName, funnelId, funnelStageId',
      },
      { status: 400 }
    )
  }

  const mapping = await prisma.facebookFormMapping.upsert({
    where: { formId },
    update: {
      formName,
      pageId,
      propertyId: propertyId || null,
      roletaId: roletaId || null,
      funnelId,
      funnelStageId,
      agencia: agencia || null,
      praca: praca || null,
      defaultBrokerId: defaultBrokerId || null,
      isActive: true,
    },
    create: {
      connectionId,
      formId,
      formName,
      pageId: pageId || '',
      propertyId: propertyId || null,
      roletaId: roletaId || null,
      funnelId,
      funnelStageId,
      agencia: agencia || null,
      praca: praca || null,
      defaultBrokerId: defaultBrokerId || null,
    },
  })

  return NextResponse.json({ mapping, syncPending: !!syncLeads })
}
