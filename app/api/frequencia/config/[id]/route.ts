import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// PUT: Atualiza uma configuração de frequência (marketing_adm)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const updateSchema = z.object({
      nome: z.string().min(1, "O nome é obrigatório."),
      latitude: z.number(),
      longitude: z.number(),
      raio: z.number().int().positive("O raio deve ser um número positivo."),
      horarios: z.array(z.object({
        inicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido."),
        fim: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido."),
      })).min(1, "Pelo menos um horário é necessário."),
      ativo: z.boolean(),
    });
    const { nome, latitude, longitude, raio, horarios, ativo } = updateSchema.parse(body);

    const updatedConfig = await prisma.frequenciaConfig.update({
      where: { id },
      data: {
        nome,
        latitude,
        longitude,
        raio,
        horarios,
        ativo,
      },
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos.', issues: error.errors }, { status: 400 });
    }
    console.error('Erro ao atualizar configuração de frequência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Apaga uma configuração de frequência (marketing_adm)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;

    await prisma.frequenciaConfig.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Configuração de frequência apagada com sucesso' });
  } catch (error) {
    console.error('Erro ao apagar configuração de frequência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
