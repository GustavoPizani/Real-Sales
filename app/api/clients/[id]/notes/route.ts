import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const notes = await sql`
      SELECT 
        cn.id, 
        cn.note, 
        cn.created_at,
        u.name as user_name
      FROM client_notes cn
      JOIN users u ON cn.user_id = u.id
      WHERE cn.client_id = ${params.id}
      ORDER BY cn.created_at DESC
    `

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    const user = token ? verifyToken(token) : null

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { note } = await request.json()

    if (!note) {
      return NextResponse.json({ error: "Nota é obrigatória" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO client_notes (client_id, user_id, note)
      VALUES (${params.id}, ${user.userId}, ${note})
      RETURNING id, note, created_at
    `

    return NextResponse.json({ note: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
