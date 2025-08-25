// app/api/roletas/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// GET: Busca todas as roletas e os corretores associados
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== 'marketing_adm') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const roletas = await prisma.roleta.findMany({
      include: {
        // Inclui os registros da tabela de junção
        corretores: {
          // E para cada registro, inclui os dados do corretor (usuário)
          include: {
            corretor: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });

    // Formata a resposta para o frontend, simplificando a estrutura de usuários
    const formattedRoletas = roletas.map(roleta => ({
      ...roleta,
      usuarios: roleta.corretores.map(rc => ({
          ...rc.corretor,
          name: rc.corretor.nome // Garante a propriedade 'name' que o frontend pode esperar
      }))
    }));

    return NextResponse.json(formattedRoletas);
  } catch (error) {
    console.error('Erro ao buscar roletas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Cria uma nova roleta e associa os corretores
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== 'marketing_adm') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { nome, usuarios } = await request.json();

    if (!nome || !usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
      return NextResponse.json(
        { error: 'Nome e pelo menos um usuário são obrigatórios.' },
        { status: 400 }
      );
    }

    const newRoleta = await prisma.roleta.create({
      data: {
        nome,
        // Conecta os corretores selecionados através da tabela de junção
        corretores: {
          create: usuarios.map((userId: string) => ({
            corretor: {
              connect: { id: userId },
            },
          })),
        },
      },
    });

    return NextResponse.json({ success: true, id: newRoleta.id }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar roleta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
