import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { notes } = body

    const result = await executeQuery(async (sql) => {
      // Buscar o lead
      const leads = await sql`
        SELECT * FROM leads WHERE id = ${params.id}
      `

      if (leads.length === 0) {
        throw new Error("Lead não encontrado")
      }

      const lead = leads[0]

      // Criar cliente a partir do lead
      const clients = await sql`
        INSERT INTO clients (name, email, phone, source, assigned_to, notes, status)
        VALUES (${lead.name}, ${lead.email}, ${lead.phone}, ${lead.source}, ${lead.assigned_to}, ${notes || lead.notes}, 'prospect')
        RETURNING *
      `

      // Marcar lead como convertido
      await sql`
        UPDATE leads 
        SET status = 'converted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${params.id}
      `

      return clients[0]
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error converting lead:", error)
    return NextResponse.json({ error: "Erro ao converter lead" }, { status: 500 })
  }
}
