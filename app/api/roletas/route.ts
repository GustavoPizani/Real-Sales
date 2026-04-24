// app/api/roletas/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// GET: Busca todas as roletas e os corretores associados
export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Corrigido: Usando leadRoulette em vez de roleta ou clientRoulette
    const roletas = await prisma.leadRoulette.findMany({
      include: {
        funnel: true,
        users: { // Corrigido: Nome da relação no novo schema
          include: {
            user: {
              select: { id: true, name: true }
            }
          },
        },
      },
      orderBy: { name: 'asc' } // Corrigido: Usando name em vez de nome
    });

    // Formata os dados para o frontend (opcional, dependendo de como sua tela espera)
    const formattedRoletas = roletas.map(roleta => ({
      ...roleta,
      corretores: roleta.users.map(u => ({
        id: u.userId,
        nome: u.user.name // Mapeia name de volta para nome se a sua tela pedir 'nome'
      }))
    }));

    return NextResponse.json(formattedRoletas, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error: any) {
    console.error('Erro na API de Roletas:', error.message);
    return NextResponse.json({ error: 'Erro ao buscar roletas' }, { status: 500 });
  }
}

// POST: Cria uma nova roleta e associa os corretores
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, funnelId, userIds } = body;

    // if (!name || !userIds || !Array.isArray(userIds)) { // Original validation, keeping it commented out for now
    //   return NextResponse.json(
    //     { error: 'Nome e pelo menos um usuário são obrigatórios.' },
    //     { status: 400 }
    //   );
    // }

    // Corrigido: Usando leadRoulette em vez de roleta ou clientRoulette
    const newRoleta = await prisma.leadRoulette.create({
      data: {
        name,
        funnelId,
        users: {
          create: userIds.map((id: string) => ({
            userId: id
          })),
        },
      },
    });

    return NextResponse.json(newRoleta);
  } catch (error: any) {
    console.error('Erro ao criar roleta:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
