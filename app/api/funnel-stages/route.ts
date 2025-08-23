import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET: Retorna todas as etapas do funil, ordenadas
export async function GET() {
  try {
    const stages = await prisma.funnelStage.findMany({
      orderBy: {
        order: 'asc',
      },
    })
    return NextResponse.json(stages)
  } catch (error) {
    console.error('[FUNNEL_STAGES_GET]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

// POST: Cria uma nova etapa do funil
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name || !color) {
      return new NextResponse('Name and color are required', { status: 400 })
    }

    // Garante que a nova etapa seja adicionada ao final
    const lastStage = await prisma.funnelStage.findFirst({
      orderBy: { order: 'desc' },
    })

    const newOrder = lastStage ? lastStage.order + 1 : 0

    const newStage = await prisma.funnelStage.create({
      data: { name, color, order: newOrder },
    })

    return NextResponse.json(newStage, { status: 201 })
  } catch (error) {
    console.error('[FUNNEL_STAGES_POST]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
