import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const client = await executeQuery(async (sql) => {
      const result = await sql`
        SELECT 
          c.*, u.name as assigned_user_name
        FROM clients c
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = ${params.id}
      `
      return result[0] || null
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, status, source, assigned_to, notes } = body

    const result = await executeQuery(async (sql) => {
      return await sql`
        UPDATE clients 
        SET 
          name = ${name},
          email = ${email || null},
          phone = ${phone || null},
          status = ${status},
          source = ${source || null},
          assigned_to = ${assigned_to || null},
          notes = ${notes || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${params.id}
        RETURNING *
      `
    })

    if (result.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    await executeQuery(async (sql) => {
      return await sql`DELETE FROM clients WHERE id = ${params.id}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Erro ao deletar cliente" }, { status: 500 })
  }
}
