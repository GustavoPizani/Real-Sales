import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const notes = await executeQuery(async (sql) => {
      return await sql`
        SELECT 
          cn.id, cn.note, cn.created_at,
          u.name as author_name
        FROM client_notes cn
        LEFT JOIN users u ON cn.user_id = u.id
        WHERE cn.client_id = ${params.id}
        ORDER BY cn.created_at DESC
      `
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error("Error fetching client notes:", error)
    return NextResponse.json({ error: "Erro ao buscar notas do cliente" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { note } = body

    if (!note) {
      return NextResponse.json({ error: "Nota é obrigatória" }, { status: 400 })
    }

    const result = await executeQuery(async (sql) => {
      return await sql`
        INSERT INTO client_notes (client_id, user_id, note)
        VALUES (${params.id}, ${user.id}, ${note})
        RETURNING *
      `
    })

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating client note:", error)
    return NextResponse.json({ error: "Erro ao criar nota do cliente" }, { status: 500 })
  }
}
