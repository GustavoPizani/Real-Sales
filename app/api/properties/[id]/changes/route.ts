import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const changes = await sql`
      SELECT 
        pc.*,
        u.name as user_name,
        approver.name as approved_by_name
      FROM property_changes pc
      LEFT JOIN users u ON pc.user_id = u.id
      LEFT JOIN users approver ON pc.approved_by = approver.id
      WHERE pc.property_id = ${params.id}
      ORDER BY pc.created_at DESC
    `

    return NextResponse.json(changes)
  } catch (error) {
    console.error("Erro ao buscar alterações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { field, oldValue, newValue, userId } = await request.json()

    const change = await sql`
      INSERT INTO property_changes (
        property_id, user_id, field, old_value, new_value, status
      ) VALUES (
        ${params.id}, ${userId}, ${field}, ${JSON.stringify(oldValue)}, ${JSON.stringify(newValue)}, 'pending'
      )
      RETURNING *
    `

    return NextResponse.json(change[0])
  } catch (error) {
    console.error("Erro ao registrar alteração:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
