import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verificar se é um webhook válido do Meta Ads
    const { entry } = body

    if (!entry || !Array.isArray(entry)) {
      return NextResponse.json({ error: "Invalid webhook data" }, { status: 400 })
    }

    for (const item of entry) {
      const { changes } = item

      if (changes && Array.isArray(changes)) {
        for (const change of changes) {
          if (change.field === "leadgen") {
            const { value } = change

            if (value && value.leadgen_id) {
              // Processar o lead do Meta Ads
              await processMetaLead(value)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Meta Ads webhook:", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }
}

async function processMetaLead(leadData: any) {
  try {
    await executeQuery(async (sql) => {
      return await sql`
        INSERT INTO leads (name, email, phone, source, status, notes)
        VALUES (
          ${leadData.name || "Lead Meta Ads"},
          ${leadData.email || null},
          ${leadData.phone || null},
          'meta_ads',
          'new',
          ${JSON.stringify(leadData)}
        )
      `
    })
  } catch (error) {
    console.error("Error saving Meta lead:", error)
  }
}

export async function GET(request: NextRequest) {
  // Verificação do webhook do Meta
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.META_ADS_WEBHOOK_SECRET) {
    return new Response(challenge)
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
