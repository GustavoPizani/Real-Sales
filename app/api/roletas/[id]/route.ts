// app/api/[id]/roletas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ... (O método GET e DELETE permanecem iguais)
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];
      const user = await getUserFromToken(token);
  
      if (!user || user.role !== Role.marketing_adm) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
  
      const roleta = await prisma.roleta.findUnique({
        where: { id: params.id },
        include: {
          corretores: { include: { corretor: true } },
          funnel: true,
        },
      });
  
      if (!roleta) return NextResponse.json({ error: 'Roleta não encontrada' }, { status: 404 });
  
      return NextResponse.json(roleta);
    } catch (error) {
      console.error('Erro ao buscar roleta:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
  }

// PUT: Atualiza uma roleta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user || user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { nome, usuarios, ativa, validFrom, validUntil, funnelId } = await request.json(); // --- MODIFICADO ---

    const updatedRoleta = await prisma.$transaction(async (tx) => {
      const roleta = await tx.roleta.update({
        where: { id: params.id },
        data: {
          nome,
          ativa,
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          funnelId: funnelId || null, // --- NOVO ---
        },
      });

      if (usuarios) { // --- MODIFICADO --- Apenas atualiza se a lista for enviada
        await tx.roletaCorretor.deleteMany({ where: { roletaId: params.id } });
        if (usuarios.length > 0) {
          await tx.roletaCorretor.createMany({
            data: usuarios.map((userId: string) => ({
              roletaId: params.id,
              corretorId: userId,
            })),
          });
        }
      }
      return roleta;
    });

    return NextResponse.json(updatedRoleta);
  } catch (error) {
    console.error('Erro ao atualizar roleta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Exclui uma roleta
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.split(' ')[1];
      const user = await getUserFromToken(token);
  
      if (!user || user.role !== Role.marketing_adm) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
  
      await prisma.roleta.delete({ where: { id: params.id } });
  
      return NextResponse.json({ message: 'Roleta excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir roleta:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
  }

