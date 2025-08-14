import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { spreadsheetId, range } = body

    if (!spreadsheetId || !range) {
      return NextResponse.json({ error: "ID da planilha e range são obrigatórios" }, { status: 400 })
    }

    // Aqui você implementaria a integração real com Google Sheets
    // Por enquanto, vamos simular a sincronização
    const mockData = [
      {
        name: "Cliente Google Sheets 1",
        email: "cliente1@sheets.com",
        phone: "(11) 99999-7777",
        source: "google_sheets",
      },
      {
        name: "Cliente Google Sheets 2",
        email: "cliente2@sheets.com",
        phone: "(11) 99999-8888",
        source: "google_sheets",
      },
    ]

    const results = []
    for (const data of mockData) {
      const result = await executeQuery(async (sql) => {
        return await sql`
          INSERT INTO clients (name, email, phone, source, assigned_to, status)
          VALUES (${data.name}, ${data.email}, ${data.phone}, ${data.source}, ${user.id}, 'lead')
          ON CONFLICT (email) DO NOTHING
          RETURNING *
        `
      })

      if (result.length > 0) {
        results.push(result[0])
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.length,
      clients: results,
    })
  } catch (error) {
    console.error("Error syncing Google Sheets:", error)
    return NextResponse.json({ error: "Erro ao sincronizar com Google Sheets" }, { status: 500 })
  }
}
