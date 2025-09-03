// c:\Users\gusta\Real-sales\app\api\users\hierarchy\route.ts
import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isValidRole(role: any): role is Role {
  return Object.values(Role).includes(role);
}

// GET: Retorna utilizadores para os filtros de hierarquia (ex: todos os diretores, ou todos os gerentes de um diretor)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Token de autenticação não encontrado' }, { status: 401 });
    }

    const loggedInUser = await getUserFromToken(token);

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
