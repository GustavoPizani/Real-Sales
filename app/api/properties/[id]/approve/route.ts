import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { changeId, action, userId } = await request.json()

    if (action === "approve") {
      // Busca a alteração
      const change = await sql`
        SELECT * FROM property_changes 
        WHERE id = ${changeId} AND property_id = ${params.id}
      `

      if (change.length === 0) {
        return NextResponse.json({ error: "Alteração não encontrada" }, { status: 404 })
      }

      const changeData = change[0]

      // Aplica a alteração na propriedade
      if (changeData.field === "typologies") {
        await sql`
          UPDATE properties 
          SET typologies = ${JSON.stringify(changeData.new_value)}
          WHERE id = ${params.id}
        `
      } else if (changeData.field === "developer_name") {
        await sql`
          UPDATE properties 
          SET developer_name = ${changeData.new_value}
          WHERE id = ${params.id}
        `
      } else if (changeData.field === "partnership_manager") {
        await sql`
          UPDATE properties 
          SET partnership_manager = ${changeData.new_value}
          WHERE id = ${params.id}
        `
      } else {
        // Para outros campos padrão
        const updateQuery = `UPDATE properties SET ${changeData.field} = $1 WHERE id = $2`
        await sql.unsafe(updateQuery, [changeData.new_value, params.id])
      }

      // Marca como aprovada
      await sql`
        UPDATE property_changes 
        SET status = 'approved', approved_by = ${userId}
        WHERE id = ${changeId}
      `
    } else if (action === "reject") {
      // Marca como rejeitada
      await sql`
        UPDATE property_changes 
        SET status = 'rejected', approved_by = ${userId}
        WHERE id = ${changeId}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao processar aprovação:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
