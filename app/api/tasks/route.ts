import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')

    let whereClause = sql``
    const conditions = []

    if (status) {
      conditions.push(sql`t.status = ${status}`)
    }

    if (clientId) {
      conditions.push(sql`t.client_id = ${clientId}`)
    }

    if (conditions.length > 0) {
      whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`
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
      ${whereClause}
      ORDER BY t.due_date ASC, t.created_at DESC
    `

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { title, description, due_date, priority = 'medium', client_id } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Título é obrigatório' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO tasks (title, description, due_date, priority, client_id, assigned_to, created_by)
      VALUES (${title}, ${description}, ${due_date}, ${priority}, ${client_id}, ${user.id}, ${user.id})
      RETURNING id, title, description, status, priority, due_date, client_id, assigned_to, created_at, updated_at
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tarefa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
