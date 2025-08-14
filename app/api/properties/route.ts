import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()

    const properties = await sql`
      SELECT 
        id,
        name,
        description,
        address,
        city,
        state,
        zip_code,
        price,
        bedrooms,
        bathrooms,
        area,
        property_type,
        status,
        images,
        features,
        created_at,
        updated_at
      FROM properties
      ORDER BY created_at DESC
    `

    return NextResponse.json(properties)
  } catch (error) {
    console.error("Error fetching properties:", error)
    return NextResponse.json({ error: "Erro ao buscar propriedades" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDb()
    const body = await request.json()

    const {
      name,
      description,
      address,
      city,
      state,
      zip_code,
      price,
      bedrooms,
      bathrooms,
      area,
      property_type,
      features,
      images,
    } = body

    if (!name || !address || !city || !price) {
      return NextResponse.json({ error: "Campos obrigatórios: nome, endereço, cidade e preço" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO properties (
        name, description, address, city, state, zip_code,
        price, bedrooms, bathrooms, area, property_type,
        features, images, status
      )
      VALUES (
        ${name}, ${description}, ${address}, ${city}, ${state}, ${zip_code},
        ${price}, ${bedrooms}, ${bathrooms}, ${area}, ${property_type},
        ${JSON.stringify(features)}, ${JSON.stringify(images)}, 'available'
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating property:", error)
    return NextResponse.json({ error: "Erro ao criar propriedade" }, { status: 500 })
  }
}
