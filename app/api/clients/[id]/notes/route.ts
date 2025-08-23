import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { content, createdBy } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Conteúdo da nota é obrigatório' },
        { status: 400 }
      )
    }

    const newNote = await prisma.nota.create({
      data: { content, createdBy, clienteId: id },
    })

    return NextResponse.json(newNote, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar nota:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

