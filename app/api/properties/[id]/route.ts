import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const properties = await sql`
      SELECT 
        p.*,
        po.name as owner_name,
        po.phone as owner_phone,
        po.email as owner_email
      FROM properties p
      LEFT JOIN property_owners po ON p.id = po.property_id
      WHERE p.id = ${params.id}
    `

    if (properties.length === 0) {
      return NextResponse.json({ error: "Imóvel não encontrado" }, { status: 404 })
    }

    const property = properties[0]

    // Buscar visitas do imóvel
    const visits = await sql`
      SELECT 
        pv.*,
        c.full_name as client_name
      FROM property_visits pv
      LEFT JOIN clients c ON pv.client_id = c.id
      WHERE pv.property_id = ${params.id}
      ORDER BY pv.visit_date DESC
    `

    // Estruturar resposta
    const response = {
      ...property,
      owner: property.owner_name
        ? {
            name: property.owner_name,
            phone: property.owner_phone,
            email: property.owner_email,
          }
        : null,
      visits: visits.map((visit) => ({
        id: visit.id,
        property_id: visit.property_id,
        client_name: visit.client_name,
        date: visit.visit_date,
        status: visit.status,
        notes: visit.notes,
      })),
    }

    // Remover campos duplicados do owner
    delete response.owner_name
    delete response.owner_phone
    delete response.owner_email

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erro ao buscar imóvel:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const data = await request.json()
    const {
      title,
      description,
      address,
      price,
      area,
      bedrooms,
      bathrooms,
      parking_spaces,
      type,
      status,
      features,
      owner,
    } = data

    // Atualizar imóvel
    const result = await sql`
      UPDATE properties 
      SET 
        title = ${title},
        description = ${description},
        address = ${address},
        price = ${price},
        area = ${area},
        bedrooms = ${bedrooms},
        bathrooms = ${bathrooms},
        parking_spaces = ${parking_spaces},
        type = ${type},
        status = ${status},
        features = ${JSON.stringify(features)},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${params.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Imóvel não encontrado" }, { status: 404 })
    }

    // Atualizar dados do proprietário se fornecidos
    if (owner) {
      await sql`
        INSERT INTO property_owners (property_id, name, phone, email)
        VALUES (${params.id}, ${owner.name}, ${owner.phone}, ${owner.email})
        ON CONFLICT (property_id) 
        DO UPDATE SET 
          name = ${owner.name},
          phone = ${owner.phone},
          email = ${owner.email},
          updated_at = CURRENT_TIMESTAMP
      `
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Erro ao atualizar imóvel:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar se há clientes associados ao imóvel
    const associatedClients = await sql`
      SELECT COUNT(*) as count
      FROM clients 
      WHERE property_of_interest_id = ${params.id}
    `

    if (associatedClients[0].count > 0) {
      return NextResponse.json({ error: "Não é possível remover imóvel com clientes associados" }, { status: 400 })
    }

    // Remover imóvel
    const result = await sql`
      DELETE FROM properties 
      WHERE id = ${params.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Imóvel não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ message: "Imóvel removido com sucesso" })
  } catch (error) {
    console.error("Erro ao remover imóvel:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
