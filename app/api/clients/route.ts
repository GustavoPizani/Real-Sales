import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const clients = await sql`
      SELECT id, name, email, phone, status, created_at, updated_at
      FROM clients
      ORDER BY created_at DESC
    `

    return NextResponse.json({ clients })
  } catch (error) {
    console.error("Error fetching clients:", error)
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

    const { name, email, phone, status = "active" } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: "Nome e email são obrigatórios" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO clients (name, email, phone, status)
      VALUES (${name}, ${email}, ${phone}, ${status})
      RETURNING id, name, email, phone, status, created_at, updated_at
    `

    return NextResponse.json({ client: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
