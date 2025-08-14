import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()

    const clients = await sql`
      SELECT 
        id,
        name,
        email,
        phone,
        status,
        source,
        assigned_to,
        created_at,
        updated_at
      FROM clients
      ORDER BY created_at DESC
    `

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDb()
    const body = await request.json()

    const { name, email, phone, source, assigned_to } = body

    if (!name || !email) {
      return NextResponse.json({ error: "Nome e email são obrigatórios" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO clients (name, email, phone, source, assigned_to, status)
      VALUES (${name}, ${email}, ${phone}, ${source}, ${assigned_to}, 'lead')
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 })
  }
}
