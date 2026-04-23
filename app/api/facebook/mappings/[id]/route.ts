import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const {
    propertyId,
    roletaId,
    funnelId,
    funnelStageId,
    agencia,
    praca,
    defaultBrokerId,
    isActive,
  } = body

  const mapping = await prisma.facebookFormMapping.update({
    where: { id: params.id },
    data: {
      propertyId: propertyId ?? null,
      roletaId: roletaId ?? null,
      funnelId,
      funnelStageId,
      agencia: agencia ?? null,
      praca: praca ?? null,
      defaultBrokerId: defaultBrokerId ?? null,
      isActive: isActive ?? true,
    },
  })

  return NextResponse.json({ mapping })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromToken()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.facebookFormMapping.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
