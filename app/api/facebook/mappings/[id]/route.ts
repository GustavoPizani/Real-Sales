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

  // Funil/Etapa só são obrigatórios sem roleta — com roleta, o lead herda o funil dela.
  if (!roletaId && (!funnelId || !funnelStageId)) {
    return NextResponse.json(
      { error: 'Sem uma roleta selecionada, Funil e Etapa são obrigatórios.' },
      { status: 400 }
    )
  }

  const mapping = await prisma.facebookFormMapping.update({
    where: { id: params.id },
    data: {
      propertyId: propertyId ?? null,
      roletaId: roletaId ?? null,
      funnelId: funnelId || null,
      funnelStageId: funnelStageId || null,
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
