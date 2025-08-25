// app/api/field-mappings/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// GET: Busca os mapeamentos para uma fonte específica (ex: 'site' ou 'meta_ads')
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== 'marketing_adm') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    if (!source) {
      return NextResponse.json({ error: "Parâmetro 'source' é obrigatório." }, { status: 400 });
    }

    const mappings = await prisma.fieldMapping.findMany({
      where: { source: source },
      orderBy: { fieldName: 'asc' },
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Erro ao buscar mapeamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Cria ou atualiza os mapeamentos para uma fonte
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || user.role !== 'marketing_adm') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { mappings, source } = await request.json();

    if (!source || !Array.isArray(mappings)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    // Usa uma transação para garantir que a exclusão e a criação ocorram juntas
    await prisma.$transaction(async (tx) => {
      // 1. Deleta os mapeamentos antigos para esta fonte
      await tx.fieldMapping.deleteMany({
        where: { source: source },
      });

      // 2. Cria os novos mapeamentos
      if (mappings.length > 0) {
        await tx.fieldMapping.createMany({
          data: mappings.map((m: { fieldName: string; mappedField: string }) => ({
            source,
            fieldName: m.fieldName,
            mappedField: m.mappedField,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar mapeamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
