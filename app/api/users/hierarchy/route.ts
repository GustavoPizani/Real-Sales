import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';

// Função auxiliar para validar se o valor da role é válido
function isValidRole(role: any): role is Role {
  return Object.values(Role).includes(role);
}

// GET: Retorna usuários para os filtros de hierarquia
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const superiorId = searchParams.get('superiorId');

  try {
    const whereClause: Prisma.UsuarioWhereInput = {};

    if (role) {
      if (!isValidRole(role)) {
        return new NextResponse('Parâmetro "role" inválido', { status: 400 });
      }
      whereClause.role = role;
    }

    if (superiorId) {
      whereClause.superiorId = superiorId;
    }

    const users = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nome: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('[USERS_HIERARCHY_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
