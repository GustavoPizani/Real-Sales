import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET: Busca uma propriedade específica com todos os detalhes
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

    const { id } = params;

    const property = await prisma.imovel.findUnique({
      where: { id },
      include: {
        endereco: true, // ✅ Adicionado para buscar o endereço
        imagens: true,
        // ✅ Garante que as tipologias sejam sempre incluídas na busca
        tipologias: {
          include: { plantas: true } // Inclui também as imagens das plantas, se houver
        },
        updater: { // ✅ Adicionado para buscar quem atualizou por último
          select: { nome: true }
        },
        creator: { // ✅ Adicionado para buscar quem criou o imóvel
          select: { nome: true }
        },
        // Adicionei a inclusão do developer, caso seja necessário no futuro.
        // Se o modelo Imovel não tiver a relação 'developer', remova a linha abaixo.
        // developer: true, 
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error(`Erro ao buscar detalhes do imóvel:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
