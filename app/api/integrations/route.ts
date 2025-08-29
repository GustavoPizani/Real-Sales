import { type NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const integrations = await sql`
      SELECT * FROM integrations LIMIT 1
    `

    return NextResponse.json(integrations[0] || {})
  } catch (error) {
    console.error("Erro ao buscar integrações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { webhook_site_url, facebook_api_key } = await request.json()

    // Verificar se já existe uma configuração
    const existing = await sql`
      SELECT id FROM integrations LIMIT 1
    `

    if (existing.length > 0) {
      // Atualizar configuração existente
      await sql`
        UPDATE integrations 
        SET webhook_site_url = ${webhook_site_url}, 
            facebook_api_key = ${facebook_api_key},
            updated_at = NOW()
        WHERE id = ${existing[0].id}
      `
    } else {
      // Criar nova configuração
      await sql`
        INSERT INTO integrations (webhook_site_url, facebook_api_key)
        VALUES (${webhook_site_url}, ${facebook_api_key})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao salvar integrações:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
