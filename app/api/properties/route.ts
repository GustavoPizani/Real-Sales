import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const properties = await prisma.imovel.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

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
      title, description, price, type, status = 'Disponivel', 
      address, bedrooms, bathrooms, area 
    } = await request.json()

    if (!title || !price || !type) {
      return NextResponse.json(
        { error: 'Título, preço e tipo são obrigatórios' },
        { status: 400 }
      )
    }

    const newProperty = await prisma.imovel.create({
      data: {
        titulo: title,
        descricao: description,
        preco: parseFloat(price),
        tipo: type,
        status: status,
        endereco: address,
        quartos: parseInt(bedrooms),
        banheiros: parseInt(bathrooms),
        area: parseInt(area),
      }
    })

    return NextResponse.json(newProperty, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar propriedade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}