import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const properties = await sql`
      SELECT id, title, description, price, address, bedrooms, bathrooms, area, status, created_at, updated_at
      FROM properties
      ORDER BY created_at DESC
    `

    return NextResponse.json({ properties })
  } catch (error) {
    console.error("Error fetching properties:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    const user = token ? verifyToken(token) : null

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { title, description, price, address, bedrooms, bathrooms, area, status = "available" } = await request.json()

    if (!title || !price || !address) {
      return NextResponse.json({ error: "Título, preço e endereço são obrigatórios" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO properties (title, description, price, address, bedrooms, bathrooms, area, status)
      VALUES (${title}, ${description}, ${price}, ${address}, ${bedrooms}, ${bathrooms}, ${area}, ${status})
      RETURNING id, title, description, price, address, bedrooms, bathrooms, area, status, created_at, updated_at
    `

    return NextResponse.json({ property: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating property:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
