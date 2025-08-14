import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const leads = await executeQuery(async (sql) => {
      return await sql`
        SELECT 
          l.id, l.name, l.email, l.phone, l.source, l.status,
          l.notes, l.assigned_to, l.created_at, l.updated_at,
          u.name as assigned_user_name
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        ORDER BY l.created_at DESC
      `
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error("Error fetching leads:", error)
    return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, source, notes, assigned_to } = body

    if (!name || !source) {
      return NextResponse.json({ error: "Nome e fonte são obrigatórios" }, { status: 400 })
    }

    const result = await executeQuery(async (sql) => {
      return await sql`
        INSERT INTO leads (name, email, phone, source, notes, assigned_to, status)
        VALUES (${name}, ${email || null}, ${phone || null}, ${source}, ${notes || null}, ${assigned_to || user.id}, 'new')
        RETURNING *
      `
    })

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating lead:", error)
    return NextResponse.json({ error: "Erro ao criar lead" }, { status: 500 })
  }
}
