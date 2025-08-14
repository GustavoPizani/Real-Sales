import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const clientId = searchParams.get("client_id")

    let query = sql`
      SELECT 
        t.id, 
        t.title, 
        t.description, 
        t.status, 
        t.priority, 
        t.due_date,
        t.created_at,
        t.updated_at,
        c.name as client_name,
        u.name as user_name
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
    `

    const conditions = []
    if (status) conditions.push(sql`t.status = ${status}`)
    if (clientId) conditions.push(sql`t.client_id = ${clientId}`)

    if (conditions.length > 0) {
      query = sql`${query} WHERE ${sql.join(conditions, sql` AND `)}`
    }

    query = sql`${query} ORDER BY t.created_at DESC`

    const tasks = await query

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    const user = token ? verifyToken(token) : null

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { title, description, status = "pending", priority = "medium", due_date, client_id } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO tasks (title, description, status, priority, due_date, client_id, user_id)
      VALUES (${title}, ${description}, ${status}, ${priority}, ${due_date}, ${client_id}, ${user.userId})
      RETURNING id, title, description, status, priority, due_date, created_at, updated_at
    `

    return NextResponse.json({ task: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
