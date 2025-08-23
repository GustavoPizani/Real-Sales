import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// GET: Retorna todos os clientes com base nos filtros
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const searchTerm = searchParams.get('search')
    const assignedUserFilter = searchParams.get('user_id')
    const dateFrom = searchParams.get('data_inicio')
    const dateTo = searchParams.get('data_fim')

    const where: Prisma.ClienteWhereInput = { AND: [] }

    // 1. Controle de acesso
    if (user.role === 'gerente') {
      const subordinateIds = (
        await prisma.usuario.findMany({
          where: { superiorId: user.id },
          select: { id: true },
        })
      ).map((u) => u.id)
      where.AND.push({ corretorId: { in: [user.id, ...subordinateIds] } })
    } else if (user.role === 'corretor') {
      where.AND.push({ corretorId: user.id })
    }

    // 2. Filtro de Status
    if (statusFilter && statusFilter !== 'todos') {
      switch (statusFilter) {
        case 'em_andamento':
          where.AND.push({ overallStatus: 'Ativo' })
          break
        case 'ganho':
          where.AND.push({ overallStatus: 'Ganho' })
          break
        case 'perdido':
          where.AND.push({ overallStatus: 'Perdido' })
          break
      }
    }

    // 3. Termo de busca
    if (searchTerm) {
      where.AND.push({
        OR: [
          { nomeCompleto: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { telefone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      })
    }

    // 4. Filtro de corretor
    if (assignedUserFilter && assignedUserFilter !== '__all__') {
      where.AND.push({ corretorId: assignedUserFilter })
    }

    // 5. Filtro de data
    if (dateFrom) {
      where.AND.push({ createdAt: { gte: new Date(dateFrom) } })
    }
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)
      where.AND.push({ createdAt: { lte: endDate } })
    }

    const clients = await prisma.cliente.findMany({
      where: where.AND.length > 0 ? where : undefined,
      include: {
        corretor: true,
        imovelDeInteresse: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST: Cria um novo cliente
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, phone, email, notes, property_of_interest_id, status } = body

    if (!full_name) {
      return NextResponse.json({ error: 'Nome completo é obrigatório' }, { status: 400 })
    }

    const newClient = await prisma.cliente.create({
      data: {
        nomeCompleto: full_name,
        telefone: phone || null,
        email: email || null,
        currentFunnelStage: status || 'Contato',
        corretorId: user.id, // Atribui ao usuário logado por padrão
        imovelDeInteresseId: property_of_interest_id || null,
        ...(notes && { notas: { create: { content: notes, createdBy: user.nome } } }),
      },
    })

    return NextResponse.json(newClient, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
