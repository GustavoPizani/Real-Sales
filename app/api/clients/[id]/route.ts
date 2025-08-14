import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const client = await sql`
      SELECT id, name, email, phone, status, created_at, updated_at
      FROM clients
      WHERE id = ${params.id}
    `

    if (client.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ client: client[0] })
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { name, email, phone, status } = await request.json()

    const result = await sql`
      UPDATE clients 
      SET name = ${name}, email = ${email}, phone = ${phone}, status = ${status}
      WHERE id = ${params.id}
      RETURNING id, name, email, phone, status, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ client: result[0] })
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    await sql`DELETE FROM clients WHERE id = ${params.id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
