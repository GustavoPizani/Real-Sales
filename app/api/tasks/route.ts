import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const tasks = await executeQuery(async (sql) => {
      return await sql`
        SELECT 
          t.id, t.title, t.description, t.status, t.priority,
          t.due_date, t.assigned_to, t.client_id, t.property_id,
          t.created_at, t.updated_at,
          c.name as client_name,
          p.name as property_name,
          u.name as assigned_user_name
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN properties p ON t.property_id = p.id
        LEFT JOIN users u ON t.assigned_to = u.id
        ORDER BY t.created_at DESC
      `
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Erro ao buscar tarefas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, status, priority, due_date, assigned_to, client_id, property_id } = body

    if (!title) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
    }

    const result = await executeQuery(async (sql) => {
      return await sql`
        INSERT INTO tasks (
          title, description, status, priority, due_date,
          assigned_to, client_id, property_id
        )
        VALUES (
          ${title}, ${description || null}, ${status || "pending"}, 
          ${priority || "medium"}, ${due_date || null},
          ${assigned_to || user.id}, ${client_id || null}, ${property_id || null}
        )
        RETURNING *
      `
    })

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Erro ao criar tarefa" }, { status: 500 })
  }
}
