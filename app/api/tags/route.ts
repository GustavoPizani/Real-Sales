// app/api/tags/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Busca todas as etiquetas (tags)
export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Erro ao buscar etiquetas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar etiquetas.' },
      { status: 500 }
    );
  }
}

// POST: Cria uma nova etiqueta
export async function POST(request: NextRequest) {
    try {
      const token = cookies().get('authToken')?.value;
      const user = await getUserFromToken(token);
      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
  
      const { name, color } = await request.json();
  
      if (!name || !color) {
        return NextResponse.json(
          { error: 'Nome e cor são obrigatórios.' },
          { status: 400 }
        );
      }
  
      const newTag = await prisma.tag.create({
        data: {
          name,
          color,
        },
      });
  
      return NextResponse.json(newTag, { status: 201 });
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor ao criar etiqueta.' },
        { status: 500 }
      );
    }
  }
