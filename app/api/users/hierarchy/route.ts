// c:\Users\gusta\Real-sales\app\api\users\hierarchy\route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { getUserFromToken } from '@/lib/auth';

function isValidRole(role: any): role is Role {
  return Object.values(Role).includes(role);
}

// GET: Retorna utilizadores para os filtros de hierarquia (ex: todos os diretores, ou todos os gerentes de um diretor)
export async function GET(request: NextRequest) {
  try {
    const loggedInUser = await getUserFromToken(request);
    if (!loggedInUser || loggedInUser.role !== 'marketing_adm') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const superiorId = searchParams.get('superiorId');

    const whereClause: Prisma.UsuarioWhereInput = {};

    if (role) {
      if (!isValidRole(role)) {
        return NextResponse.json({ error: 'Parâmetro "role" inválido' }, { status: 400 });
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
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
