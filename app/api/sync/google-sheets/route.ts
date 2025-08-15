import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getLeadsFromSheet } from '@/lib/google-sheets'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    // Verificar chave de API
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.SYNC_API_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('🔄 Iniciando sincronização com Google Sheets...')
    
    const sheetLeads = await getLeadsFromSheet()
    let newLeadsCount = 0
    let updatedLeadsCount = 0
    let errors = []

    for (const lead of sheetLeads) {
      try {
        if (!lead.email || !lead.name) {
          continue // Pular linhas sem email ou nome
        }

        // Verificar se o lead já existe
        const existingLeads = await sql`
          SELECT id, updated_at FROM leads WHERE email = ${lead.email}
        `

        if (existingLeads.length === 0) {
          // Criar novo lead
          await sql`
            INSERT INTO leads (name, email, phone, source, campaign, status)
            VALUES (${lead.name}, ${lead.email}, ${lead.phone}, 'google_sheets', 
                    ${lead.campaign}, 'new')
          `
          newLeadsCount++
          console.log(`✅ Novo lead: ${lead.name} (${lead.email})`)
        } else {
          // Atualizar lead existente se necessário
          await sql`
            UPDATE leads 
            SET name = ${lead.name}, 
                phone = ${lead.phone}, 
                campaign = ${lead.campaign},
                updated_at = CURRENT_TIMESTAMP
            WHERE email = ${lead.email}
          `
          updatedLeadsCount++
          console.log(`🔄 Lead atualizado: ${lead.name} (${lead.email})`)
        }
      } catch (error) {
        console.error(`❌ Erro ao processar lead ${lead.email}:`, error)
        errors.push(`${lead.email}: ${error}`)
      }
    }

    const response = {
      success: true,
      message: 'Sincronização concluída com sucesso',
      summary: {
        totalLeadsInSheet: sheetLeads.length,
        newLeads: newLeadsCount,
        updatedLeads: updatedLeadsCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('✅ Sincronização concluída:', response.summary)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro na sincronização com Google Sheets',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para testar a conexão
export async function GET() {
  try {
    const leads = await getLeadsFromSheet()
    return NextResponse.json({
      success: true,
      message: 'Conexão com Google Sheets funcionando',
      totalLeads: leads.length,
      sampleLeads: leads.slice(0, 3).map(lead => ({
        name: lead.name,
        email: lead.email,
        campaign: lead.campaign
      }))
    })
  } catch (error) {
    console.error('❌ Erro ao testar Google Sheets:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro ao conectar com Google Sheets',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
