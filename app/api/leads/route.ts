// app/api/leads/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// GET: Busca todos os leads
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Apenas usuários com permissão podem ver todos os leads
    if (user.role !== 'marketing_adm' && user.role !== 'diretor') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const leads = await prisma.lead.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ leads });

  } catch (error) {
    console.error('Erro ao buscar leads:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar leads.' },
      { status: 500 }
    );
  }
}

// POST: Cria um novo lead
export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, source, notes } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios.' },
        { status: 400 }
      );
    }

    // Verifica se já existe um lead ou cliente com este email para evitar duplicatas
    const existingLead = await prisma.lead.findFirst({ where: { email } });
    const existingClient = await prisma.client.findUnique({ where: { email } });

    if (existingLead || existingClient) {
      return NextResponse.json(
        { error: 'Já existe um lead ou cliente com este email.' },
        { status: 409 } // 409 Conflict
      );
    }

    const newLead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        source: source || 'manual',
        notes: notes || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      lead: newLead,
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar lead:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar lead.' },
      { status: 500 }
    );
  }
}
