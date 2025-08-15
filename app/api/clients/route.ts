import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const dateFilter = searchParams.get("date_filter")
    const dataInicio = searchParams.get("data_inicio")
    const dataFim = searchParams.get("data_fim")
    const search = searchParams.get("search")
    const userId = searchParams.get("user_id")

    // Aplicar filtros baseados na hierarquia do usuário
    const whereConditions = []
    const queryParams: any[] = []

    // Controle de acesso baseado na hierarquia
    switch (user.role) {
      case "marketing_adm":
      case "diretor":
        // Pode ver todos os clientes
        break

      case "gerente":
        // Pode ver apenas clientes dos corretores subordinados
        const subordinateIds = await sql`
          SELECT id FROM users WHERE manager_id = ${user.id}
        `
        const ids = subordinateIds.map((u) => u.id)
        ids.push(user.id) // Incluir próprios clientes se houver

        if (ids.length > 0) {
          whereConditions.push(`c.user_id = ANY($${queryParams.length + 1})`)
          queryParams.push(ids)
        } else {
          // Se não tem subordinados, não vê nenhum cliente
          whereConditions.push("1 = 0")
        }
        break

      case "corretor":
        // Pode ver apenas seus próprios clientes
        whereConditions.push(`c.user_id = $${queryParams.length + 1}`)
        queryParams.push(user.id)
        break
    }

    // Filtros adicionais
    if (status && status !== "todos") {
      switch (status) {
        case "em_andamento":
          whereConditions.push(`c.status IS NULL OR c.status = 'active'`)
          break
        case "ganho":
          whereConditions.push(`c.status = 'won'`)
          break
        case "perdido":
          whereConditions.push(`c.status = 'lost'`)
          break
      }
    }

    if (search) {
      whereConditions.push(`(
        c.full_name ILIKE $${queryParams.length + 1} OR 
        c.email ILIKE $${queryParams.length + 1} OR 
        c.phone ILIKE $${queryParams.length + 1}
      )`)
      queryParams.push(`%${search}%`)
    }

    if (userId && userId !== "__all__") {
      whereConditions.push(`c.user_id = $${queryParams.length + 1}`)
      queryParams.push(userId)
    }

    if (dataInicio) {
      whereConditions.push(`c.created_at >= $${queryParams.length + 1}`)
      queryParams.push(dataInicio)
    }

    if (dataFim) {
      whereConditions.push(`c.created_at <= $${queryParams.length + 1}`)
      queryParams.push(dataFim)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const query = `
      SELECT 
        c.*,
        u.name as assigned_user_name,
        u.email as assigned_user_email,
        u.role as assigned_user_role,
        p.title as property_title,
        p.address as property_address,
        p.price as property_price
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN properties p ON c.property_of_interest_id = p.id
      ${whereClause}
      ORDER BY c.updated_at DESC
    `

    const clients = await sql.unsafe(query, queryParams)

    // Estruturar resposta
    const response = clients.map((client) => ({
      id: client.id,
      full_name: client.full_name,
      phone: client.phone,
      email: client.email,
      funnel_status: client.funnel_status,
      notes: client.notes,
      created_at: client.created_at,
      updated_at: client.updated_at,
      user_id: client.user_id,
      property_of_interest_id: client.property_of_interest_id,
      status: client.status,
      lost_reason: client.lost_reason,
      property_title: client.property_title,
      property_address: client.property_address,
      property_price: client.property_price,
      assigned_user: client.assigned_user_name
        ? {
            id: client.user_id,
            name: client.assigned_user_name,
            email: client.assigned_user_email,
            role: client.assigned_user_role,
          }
        : null,
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erro ao buscar clientes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { full_name, phone, email, funnel_status, notes, property_of_interest_id, user_id } = await request.json()

    if (!full_name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    // Determinar o user_id baseado na hierarquia
    let assignedUserId = user_id

    // Se não foi especificado um usuário, usar regras de hierarquia
    if (!assignedUserId) {
      switch (user.role) {
        case "corretor":
          assignedUserId = user.id
          break
        default:
          // Para outros roles, é obrigatório especificar
          if (!user_id) {
            return NextResponse.json({ error: "Usuário responsável é obrigatório" }, { status: 400 })
          }
      }
    }

    // Validar se o usuário pode atribuir para o user_id especificado
    if (assignedUserId !== user.id) {
      switch (user.role) {
        case "corretor":
          return NextResponse.json({ error: "Corretor só pode criar clientes para si mesmo" }, { status: 403 })

        case "gerente":
          // Verificar se o usuário é subordinado
          const subordinate = await sql`
            SELECT id FROM users WHERE id = ${assignedUserId} AND manager_id = ${user.id}
          `
          if (subordinate.length === 0 && assignedUserId !== user.id) {
            return NextResponse.json({ error: "Gerente só pode atribuir para seus subordinados" }, { status: 403 })
          }
          break
      }
    }

    const result = await sql`
      INSERT INTO clients (
        full_name, 
        phone, 
        email, 
        funnel_status, 
        notes, 
        property_of_interest_id,
        user_id,
        status
      )
      VALUES (
        ${full_name}, 
        ${phone}, 
        ${email}, 
        ${funnel_status || "Contato"}, 
        ${notes}, 
        ${property_of_interest_id},
        ${assignedUserId},
        'active'
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
