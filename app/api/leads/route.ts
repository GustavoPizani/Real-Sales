import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let query = "SELECT * FROM leads"
    const conditions = []
    const params = []

    if (status && status !== "all") {
      conditions.push("status = $" + (params.length + 1))
      params.push(status)
    }

    if (search) {
      conditions.push("(name ILIKE $" + (params.length + 1) + " OR email ILIKE $" + (params.length + 2) + ")")
      params.push(`%${search}%`, `%${search}%`)
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += " ORDER BY created_at DESC"

    const leads = await sql(query, params)

    return NextResponse.json({
      success: true,
      data: leads,
    })
  } catch (error) {
    console.error("Erro ao buscar leads:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao buscar leads",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, source, campaign, status = "new", notes } = body

    // Validação básica
    if (!name || !email) {
      return NextResponse.json({ success: false, error: "Nome e email são obrigatórios" }, { status: 400 })
    }

    // Verificar se já existe um lead com este email
    const existingLead = await sql`
      SELECT id FROM leads WHERE email = ${email}
    `

    if (existingLead.length > 0) {
      return NextResponse.json({ success: false, error: "Já existe um lead com este email" }, { status: 409 })
    }

    // Criar novo lead
    const newLead = await sql`
      INSERT INTO leads (name, email, phone, source, campaign, status, notes)
      VALUES (${name}, ${email}, ${phone}, ${source}, ${campaign}, ${status}, ${notes})
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Lead criado com sucesso",
      data: newLead[0],
    })
  } catch (error) {
    console.error("Erro ao criar lead:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao criar lead",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, phone, source, campaign, status, notes } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "ID do lead é obrigatório" }, { status: 400 })
    }

    const updatedLead = await sql`
      UPDATE leads 
      SET name = ${name}, 
          email = ${email}, 
          phone = ${phone}, 
          source = ${source}, 
          campaign = ${campaign}, 
          status = ${status}, 
          notes = ${notes},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (updatedLead.length === 0) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Lead atualizado com sucesso",
      data: updatedLead[0],
    })
  } catch (error) {
    console.error("Erro ao atualizar lead:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao atualizar lead",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID do lead é obrigatório" }, { status: 400 })
    }

    const deletedLead = await sql`
      DELETE FROM leads WHERE id = ${id} RETURNING *
    `

    if (deletedLead.length === 0) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Lead excluído com sucesso",
    })
  } catch (error) {
    console.error("Erro ao excluir lead:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao excluir lead",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
