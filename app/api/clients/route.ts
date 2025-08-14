import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { executeQuery } from "@/lib/db"
import { generateId } from "@/lib/utils"
import type { ApiResponse } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (status) {
      whereClause += ` AND status = $${params.length + 1}`
      params.push(status)
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 2})`
      params.push(`%${search}%`, `%${search}%`)
    }

    const clients = await executeQuery(async (sql) => {
      return await sql`
        SELECT id, name, email, phone, status, source, assigned_to, created_at, updated_at, notes
        FROM clients 
        ${sql.unsafe(whereClause)}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    })

    const totalResult = await executeQuery(async (sql) => {
      return await sql`
        SELECT COUNT(*) as count
        FROM clients 
        ${sql.unsafe(whereClause)}
      `
    })

    const total = totalResult[0]?.count || 0

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        clients,
        pagination: {
          page,
          limit,
          total: Number.parseInt(total),
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get clients error:", error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Erro ao buscar clientes",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { name, email, phone, status, source, notes } = body

    if (!name || !email || !phone) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Nome, email e telefone são obrigatórios",
        },
        { status: 400 },
      )
    }

    const clientId = generateId()
    const now = new Date().toISOString()

    const client = await executeQuery(async (sql) => {
      return await sql`
        INSERT INTO clients (id, name, email, phone, status, source, assigned_to, notes, created_at, updated_at)
        VALUES (${clientId}, ${name}, ${email}, ${phone}, ${status || "lead"}, ${source || "manual"}, ${user.id}, ${notes || ""}, ${now}, ${now})
        RETURNING *
      `
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: client[0],
      message: "Cliente criado com sucesso",
    })
  } catch (error) {
    console.error("Create client error:", error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Erro ao criar cliente",
      },
      { status: 500 },
    )
  }
}
