import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getUserFromToken } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const leads = await sql`
      SELECT id, name, email, phone, source, campaign, status, created_at, updated_at
      FROM leads
      ORDER BY created_at DESC
    `

    return NextResponse.json({ leads })

  } catch (error) {
    console.error('Erro ao buscar leads:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, source, campaign } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe um lead com este email
    const existingLeads = await sql`
      SELECT id FROM leads WHERE email = ${email}
    `

    if (existingLeads.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um lead com este email' },
        { status: 409 }
      )
    }

    const result = await sql`
      INSERT INTO leads (name, email, phone, source, campaign, status)
      VALUES (${name}, ${email}, ${phone || ''}, ${source || 'manual'}, ${campaign || 'Não informado'}, 'new')
      RETURNING id, name, email, phone, source, campaign, status, created_at
    `

    return NextResponse.json({
      success: true,
      lead: result[0]
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar lead:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
