import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tasks = await sql`
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, 
        t.due_date, t.client_id, t.assigned_to, t.created_at, t.updated_at,
        c.name as client_name,
        u.name as assigned_user_name
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ${params.id}
    `

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    }

    return NextResponse.json(tasks[0])
  } catch (error) {
    console.error('Erro ao buscar tarefa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { title, description, status, priority, due_date, client_id } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Título é obrigatório' },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE tasks 
      SET 
        title = ${title}, 
        description = ${description}, 
        status = ${status}, 
        priority = ${priority}, 
        due_date = ${due_date}, 
        client_id = ${client_id},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${params.id}
      RETURNING id, title, description, status, priority, due_date, client_id, assigned_to, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const result = await sql`
      DELETE FROM tasks 
      WHERE id = ${params.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Tarefa removida com sucesso' })
  } catch (error) {
    console.error('Erro ao remover tarefa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
