import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

async function getActiveRoleta() {
  const [roleta] = await sql`
    SELECT 
      r.*,
      ARRAY_AGG(ru.user_id ORDER BY ru.created_at) as user_ids
    FROM roletas r
    JOIN roleta_usuarios ru ON r.id = ru.roleta_id
    WHERE r.ativa = true
    GROUP BY r.id
    LIMIT 1
  `
  return roleta
}

async function getNextCorretor(roleta: any) {
  if (!roleta || !roleta.user_ids || roleta.user_ids.length === 0) {
    return null
  }

  const nextIndex = (roleta.last_assigned_index + 1) % roleta.user_ids.length
  const corretorId = roleta.user_ids[nextIndex]

  // Atualizar o índice da roleta
  await sql`
    UPDATE roletas 
    SET last_assigned_index = ${nextIndex}
    WHERE id = ${roleta.id}
  `

  return corretorId
}

async function getFieldMappings() {
  const mappings = await sql`
    SELECT field_name, mapped_field FROM field_mappings WHERE source = 'site'
  `

  const mappingObj: Record<string, string> = {}
  mappings.forEach((mapping: any) => {
    mappingObj[mapping.field_name] = mapping.mapped_field
  })

  return mappingObj
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Buscar mapeamentos de campos
    const fieldMappings = await getFieldMappings()

    // Mapear dados recebidos para campos do cliente
    const clientData: any = {}

    if (fieldMappings.full_name && data[fieldMappings.full_name]) {
      clientData.full_name = data[fieldMappings.full_name]
    }

    if (fieldMappings.email && data[fieldMappings.email]) {
      clientData.email = data[fieldMappings.email]
    }

    if (fieldMappings.phone && data[fieldMappings.phone]) {
      clientData.phone = data[fieldMappings.phone]
    }

    if (fieldMappings.notes && data[fieldMappings.notes]) {
      clientData.notes = data[fieldMappings.notes]
    }

    // Buscar roleta ativa e próximo corretor
    const roleta = await getActiveRoleta()
    const corretorId = await getNextCorretor(roleta)

    if (!corretorId) {
      return NextResponse.json({ error: "Nenhuma roleta ativa encontrada" }, { status: 400 })
    }

    // Criar cliente
    const [client] = await sql`
      INSERT INTO clients (
        full_name, 
        email, 
        phone, 
        notes, 
        funnel_status, 
        user_id,
        created_at,
        updated_at
      )
      VALUES (
        ${clientData.full_name || ""},
        ${clientData.email || ""},
        ${clientData.phone || ""},
        ${clientData.notes || "Lead recebido via site"},
        'Contato',
        ${corretorId},
        NOW(),
        NOW()
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      clientId: client.id,
      assignedTo: corretorId,
    })
  } catch (error) {
    console.error("Erro no webhook do site:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
