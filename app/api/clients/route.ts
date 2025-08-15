import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const clients = await executeQuery(`
      SELECT c.*, u.name as assigned_user_name 
      FROM clients c 
      LEFT JOIN users u ON c.assigned_to = u.id 
      ORDER BY c.created_at DESC
    `)

    return NextResponse.json({ success: true, data: clients })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const data = await request.json()

    const result = await executeQuery(
      `
      INSERT INTO clients (name, email, phone, status, source, assigned_to, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `,
      [
        data.name,
        data.email || null,
        data.phone || null,
        data.status || "lead",
        data.source || "manual",
        data.assigned_to || user.id,
      ],
    )

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
