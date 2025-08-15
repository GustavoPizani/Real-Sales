import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source") || "site"

    const mappings = await sql`
      SELECT * FROM field_mappings 
      WHERE source = ${source}
      ORDER BY field_name
    `

    return NextResponse.json(mappings)
  } catch (error) {
    console.error("Erro ao buscar mapeamentos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { mappings, source } = await request.json()

    // Deletar mapeamentos existentes para a fonte
    await sql`
      DELETE FROM field_mappings WHERE source = ${source}
    `

    // Inserir novos mapeamentos
    for (const mapping of mappings) {
      await sql`
        INSERT INTO field_mappings (field_name, mapped_field, source)
        VALUES (${mapping.field_name}, ${mapping.mapped_field}, ${source})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao salvar mapeamentos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
