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
    SELECT field_name, mapped_field FROM field_mappings WHERE source = 'facebook'
  `

  const mappingObj: Record<string, string> = {}
  mappings.forEach((mapping: any) => {
    mappingObj[mapping.field_name] = mapping.mapped_field
  })

  return mappingObj
}

export async function GET(request: NextRequest) {
  // Verificação do webhook do Facebook
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === "your_verify_token") {
    return new NextResponse(challenge)
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Processar dados do Facebook Lead Ads
    if (data.object === "page") {
      for (const entry of data.entry) {
        for (const change of entry.changes) {
          if (change.field === "leadgen") {
            const leadgenData = change.value

            // Buscar mapeamentos de campos
            const fieldMappings = await getFieldMappings()

            // Mapear dados recebidos para campos do cliente
            const clientData: any = {}

            if (fieldMappings.full_name && leadgenData[fieldMappings.full_name]) {
              clientData.full_name = leadgenData[fieldMappings.full_name]
            }

            if (fieldMappings.email && leadgenData[fieldMappings.email]) {
              clientData.email = leadgenData[fieldMappings.email]
            }

            if (fieldMappings.phone && leadgenData[fieldMappings.phone]) {
              clientData.phone = leadgenData[fieldMappings.phone]
            }

            // Buscar roleta ativa e próximo corretor
            const roleta = await getActiveRoleta()
            const corretorId = await getNextCorretor(roleta)

            if (!corretorId) {
              console.error("Nenhuma roleta ativa encontrada")
              continue
            }

            // Criar cliente
            await sql`
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
                'Lead recebido via Facebook Lead Ads',
                'Contato',
                ${corretorId},
                NOW(),
                NOW()
              )
            `
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro no webhook do Facebook:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
