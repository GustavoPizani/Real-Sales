import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas marketing_adm pode listar todos os usuários
    if (user.role !== "marketing_adm") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const users = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.manager_id,
        u.created_at,
        m.name as manager_name,
        m.email as manager_email,
        m.role as manager_role
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      ORDER BY u.created_at DESC
    `

    // Estruturar resposta com hierarquia
    const response = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      manager_id: user.manager_id,
      created_at: user.created_at,
      manager: user.manager_name
        ? {
            id: user.manager_id,
            name: user.manager_name,
            email: user.manager_email,
            role: user.manager_role,
          }
        : null,
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas marketing_adm pode criar usuários
    if (user.role !== "marketing_adm") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { name, email, password, role, manager_id } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Nome, email, senha e cargo são obrigatórios" }, { status: 400 })
    }

    // Validar se o email já existe
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Email já está em uso" }, { status: 400 })
    }

    // Validar hierarquia
    if (role === "corretor" && !manager_id) {
      return NextResponse.json({ error: "Corretor deve ter um gerente responsável" }, { status: 400 })
    }

    if (manager_id) {
      const manager = await sql`
        SELECT role FROM users WHERE id = ${manager_id}
      `

      if (manager.length === 0) {
        return NextResponse.json({ error: "Gerente/Diretor não encontrado" }, { status: 400 })
      }

      // Validar hierarquia correta
      if (role === "gerente" && manager[0].role !== "diretor") {
        return NextResponse.json({ error: "Gerente deve se reportar a um diretor" }, { status: 400 })
      }

      if (role === "corretor" && manager[0].role !== "gerente") {
        return NextResponse.json({ error: "Corretor deve se reportar a um gerente" }, { status: 400 })
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar usuário
    const result = await sql`
      INSERT INTO users (name, email, password, role, manager_id)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role}, ${manager_id || null})
      RETURNING id, name, email, role, manager_id, created_at
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
