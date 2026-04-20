import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth'; // Supondo que você tenha esta função

export const dynamic = 'force-dynamic';

// =================================================================
// NOVA FUNÇÃO GET (A CORREÇÃO PRINCIPAL)
// =================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: clientId } = params;
    if (!clientId) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        BROKER: true,
        imovelDeInteresse: true,
        notas: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        tarefas: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}


// =================================================================
// FUNÇÃO PUT (PARA ATUALIZAR O CLIENTE)
// =================================================================
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = cookies().get('authToken')?.value;
        const user = await getUserFromToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id: clientId } = params;
        const body = await request.json();

        const updatedClient = await prisma.client.update({
            where: { id: clientId },
            data: {
                ...body,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(updatedClient);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}


// =================================================================
// SUA FUNÇÃO POST (PARA CRIAR NOTAS - JÁ ESTAVA CORRETA)
// =================================================================
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);

    if (!user || !user.name) { // Adicionada verificação para user.name
      return NextResponse.json({ error: 'Não autorizado ou name do usuário ausente' }, { status: 401 });
    }

    const { id: clientId } = params;
    if (!clientId) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Conteúdo da nota é obrigatório' }, { status: 400 });
    }

    const [newNote] = await prisma.$transaction([
      prisma.note.create({
        data: {
          content,
          createdBy: user.name,
          clienteId: clientId,
        },
      }),
      prisma.client.update({
        where: { id: clientId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}