import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const task = await executeQuery(async (sql) => {
      const result = await sql`
        SELECT 
          t.*, 
          c.name as client_name,
          p.name as property_name,
          u.name as assigned_user_name
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN properties p ON t.property_id = p.id
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.id = ${params.id}
      `
      return result[0] || null
    })

    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json({ error: "Erro ao buscar tarefa" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, status, priority, due_date, assigned_to, client_id, property_id } = body

    const result = await executeQuery(async (sql) => {
      return await sql`
        UPDATE tasks 
        SET 
          title = ${title},
          description = ${description || null},
          status = ${status},
          priority = ${priority},
          due_date = ${due_date || null},
          assigned_to = ${assigned_to || null},
          client_id = ${client_id || null},
          property_id = ${property_id || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${params.id}
        RETURNING *
      `
    })

    if (result.length === 0) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Erro ao atualizar tarefa" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    await executeQuery(async (sql) => {
      return await sql`DELETE FROM tasks WHERE id = ${params.id}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Erro ao deletar tarefa" }, { status: 500 })
  }
}
