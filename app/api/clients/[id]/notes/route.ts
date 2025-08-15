import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const notes = await sql`
      SELECT 
        cn.id, cn.note, cn.created_at,
        u.name as author_name
      FROM client_notes cn
      LEFT JOIN users u ON cn.user_id = u.id
      WHERE cn.client_id = ${params.id}
      ORDER BY cn.created_at DESC
    `

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { note } = await request.json()

    if (!note) {
      return NextResponse.json(
        { error: 'Nota é obrigatória' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO client_notes (client_id, user_id, note)
      VALUES (${params.id}, ${user.id}, ${note})
      RETURNING id, note, created_at
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Erro ao criar nota:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
