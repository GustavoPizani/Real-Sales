import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const properties = await sql`
      SELECT 
        id, title, description, price, type, status, 
        address, bedrooms, bathrooms, area, created_at, updated_at
      FROM properties
      ORDER BY created_at DESC
    `

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Erro ao buscar propriedades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { 
      title, description, price, type, status = 'available', 
      address, bedrooms, bathrooms, area 
    } = await request.json()

    if (!title || !price || !type) {
      return NextResponse.json(
        { error: 'Título, preço e tipo são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO properties (
        title, description, price, type, status, 
        address, bedrooms, bathrooms, area
      )
      VALUES (
        ${title}, ${description}, ${price}, ${type}, ${status},
        ${address}, ${bedrooms}, ${bathrooms}, ${area}
      )
      RETURNING id, title, description, price, type, status, address, bedrooms, bathrooms, area, created_at, updated_at
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Erro ao criar propriedade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
