// app/api/roletas/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Busca todas as roletas e os corretores associados
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'marketing_adm') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const roletas = await prisma.roleta.findMany({
      include: {
        funnel: true, // --- NOVO --- Inclui o funil associado
        corretores: {
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

    const formattedRoletas = await Promise.all(roletas.map(async roleta => {
      const usuariosComContagem = await Promise.all(roleta.corretores.map(async rc => {
        const leadCount = await prisma.cliente.count({
          where: {
            corretorId: rc.corretor.id,
          },
        });
        return {
          id: rc.corretor.id,
          name: rc.corretor.nome,
          email: rc.corretor.email,
          leadCount: leadCount,
        };
      }));

      return {
        ...roleta,
        created_at: roleta.createdAt, // --- CORRIGIDO --- Garante que a data de criação é enviada
        usuarios: usuariosComContagem,
      };
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
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'marketing_adm') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { nome, usuarios, validFrom, validUntil, funnelId } = await request.json(); // --- MODIFICADO ---
    if (!nome || !usuarios || !Array.isArray(usuarios)) {
      return NextResponse.json(
        { error: 'Nome e pelo menos um usuário são obrigatórios.' },
        { status: 400 }
      );
    }

    const newRoleta = await prisma.roleta.create({
      data: {
        nome,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        funnelId: funnelId || null, // --- NOVO ---
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

