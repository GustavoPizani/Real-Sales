import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { title, description, status, priority, due_date } = await request.json()

    const result = await sql`
      UPDATE tasks 
      SET title = ${title}, description = ${description}, status = ${status}, 
          priority = ${priority}, due_date = ${due_date}
      WHERE id = ${params.id}
      RETURNING id, title, description, status, priority, due_date, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ task: result[0] })
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    await sql`DELETE FROM tasks WHERE id = ${params.id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
