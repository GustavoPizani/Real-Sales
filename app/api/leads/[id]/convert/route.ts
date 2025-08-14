import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getUserFromToken } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const leadId = parseInt(params.id)

    // Buscar o lead
    const leads = await sql`
      SELECT * FROM leads WHERE id = ${leadId}
    `

    if (leads.length === 0) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    const lead = leads[0]

    // Verificar se já existe um cliente com este email
    const existingClients = await sql`
      SELECT id FROM clients WHERE email = ${lead.email}
    `

    if (existingClients.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um cliente com este email' },
        { status: 409 }
      )
    }

    // Criar cliente
    const clientResult = await sql`
      INSERT INTO clients (name, email, phone, status)
      VALUES (${lead.name}, ${lead.email}, ${lead.phone}, 'active')
      RETURNING id, name, email, phone, status, created_at
    `

    // Atualizar status do lead
    await sql`
      UPDATE leads 
      SET status = 'converted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${leadId}
    `

    return NextResponse.json({
      message: 'Lead convertido com sucesso',
      client: clientResult[0]
    })

  } catch (error) {
    console.error('Error converting lead:', error)
    return NextResponse.json(
      { error: 'Erro ao converter lead' },
      { status: 500 }
    )
  }
}
