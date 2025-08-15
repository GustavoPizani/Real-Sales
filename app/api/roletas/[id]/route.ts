import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { nome, usuarios, ativa } = await request.json()
    const roletaId = params.id

    // Atualizar roleta
    await sql`
      UPDATE roletas 
      SET nome = ${nome}, ativa = ${ativa}, updated_at = NOW()
      WHERE id = ${roletaId}
    `

    // Remover usuários existentes
    await sql`
      DELETE FROM roleta_usuarios WHERE roleta_id = ${roletaId}
    `

    // Adicionar novos usuários
    for (const userId of usuarios) {
      await sql`
        INSERT INTO roleta_usuarios (roleta_id, user_id)
        VALUES (${roletaId}, ${userId})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar roleta:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roletaId = params.id

    await sql`
      DELETE FROM roletas WHERE id = ${roletaId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar roleta:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
