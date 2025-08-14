import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Verificar se é um lead do Meta Ads
    if (data.object === 'page' && data.entry) {
      for (const entry of data.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              const leadData = change.value
              
              // Extrair dados do lead
              const { form_id, leadgen_id, created_time, field_data } = leadData
              
              // Processar field_data para extrair nome, email, etc.
              const leadInfo: any = {}
              field_data.forEach((field: any) => {
                leadInfo[field.name] = field.values[0]
              })
              
              // Criar lead no banco
              await sql`
                INSERT INTO leads (
                  name, email, phone, source, 
                  external_id, form_id, notes
                )
                VALUES (
                  ${leadInfo.full_name || leadInfo.name}, 
                  ${leadInfo.email}, 
                  ${leadInfo.phone_number || leadInfo.phone}, 
                  'meta_ads',
                  ${leadgen_id},
                  ${form_id},
                  ${JSON.stringify(leadInfo)}
                )
              `
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Erro no webhook' },
      { status: 500 }
    )
  }
}

// Verificação do webhook do Meta
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge)
  }

  return new Response('Forbidden', { status: 403 })
}
