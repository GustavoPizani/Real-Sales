import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const roletas = await sql`
      SELECT 
        r.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', u.id,
              'name', u.name,
              'email', u.email
            )
          ) FILTER (WHERE u.id IS NOT NULL), 
          '[]'::json
        ) as usuarios
      FROM roletas r
      LEFT JOIN roleta_usuarios ru ON r.id = ru.roleta_id
      LEFT JOIN users u ON ru.user_id = u.id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `

    return NextResponse.json(roletas)
  } catch (error) {
    console.error("Erro ao buscar roletas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nome, usuarios } = await request.json()

    // Criar roleta
    const [roleta] = await sql`
      INSERT INTO roletas (nome)
      VALUES (${nome})
      RETURNING id
    `

    // Adicionar usuários à roleta
    for (const userId of usuarios) {
      await sql`
        INSERT INTO roleta_usuarios (roleta_id, user_id)
        VALUES (${roleta.id}, ${userId})
      `
    }

    return NextResponse.json({ success: true, id: roleta.id })
  } catch (error) {
    console.error("Erro ao criar roleta:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
