import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request, { params }: { params: { clientId: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Conteúdo da nota é obrigatório' }, { status: 400 });
    }

    // Usar uma transação para garantir que ambas as operações (criar nota e atualizar cliente)
    // sejam concluídas com sucesso ou revertidas juntas.
    const [newNote] = await prisma.$transaction([
      prisma.nota.create({
        data: {
          content,
          createdBy: user.name, // Corrigido: o objeto 'user' do token usa 'name'
          clienteId: params.clientId,
        },
      }),
      prisma.cliente.update({
        where: { id: params.clientId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
