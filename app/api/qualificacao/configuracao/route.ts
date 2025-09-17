import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET: Retorna a configuração atual do bolsão
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Garante que a configuração e os bolsões existam
    const config = await prisma.configuracaoBolsao.findFirst() ?? await prisma.configuracaoBolsao.create({ data: {} });
    await prisma.bolsao.upsert({ where: { nome: 'Prioritário' }, update: {}, create: { nome: 'Prioritário' } });
    await prisma.bolsao.upsert({ where: { nome: 'Geral' }, update: {}, create: { nome: 'Geral' } });

    // Busca todos os usuários que podem participar
    const users = await prisma.usuario.findMany({
      where: { role: { in: [Role.corretor, Role.gerente] } },
      select: { id: true, nome: true },
    });

    // Busca as permissões atuais
    const permissions = await prisma.bolsaoUsuario.findMany({
      include: { bolsao: true },
    });

    const permissionsByPool = {
      prioritario: permissions.filter(p => p.bolsao.nome === 'Prioritário').map(p => p.usuarioId),
      geral: permissions.filter(p => p.bolsao.nome === 'Geral').map(p => p.usuarioId),
    };

    return NextResponse.json({ config, users, permissions: permissionsByPool });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Atualiza a configuração do bolsão
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user || user.role !== Role.marketing_adm) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { configData, permissions } = body;

    const currentConfig = await prisma.configuracaoBolsao.findFirst();

    await prisma.$transaction(async (tx) => {
      // 1. Atualiza as configurações de tempo/raio
      await tx.configuracaoBolsao.update({
        where: { id: currentConfig!.id },
        data: {
          raioAtribuicaoMetros: parseInt(configData.raioAtribuicaoMetros, 10),
          tempoAteBolsaoPrioritarioMinutos: parseInt(configData.tempoAteBolsaoPrioritarioMinutos, 10),
          tempoAteBolsaoGeralMinutos: parseInt(configData.tempoAteBolsaoGeralMinutos, 10),
        },
      });

      // 2. Atualiza as permissões
      const bolsaoPrioritario = await tx.bolsao.findUnique({ where: { nome: 'Prioritário' } });
      const bolsaoGeral = await tx.bolsao.findUnique({ where: { nome: 'Geral' } });

      // Limpa permissões antigas e insere as novas para o bolsão prioritário
      await tx.bolsaoUsuario.deleteMany({ where: { bolsaoId: bolsaoPrioritario!.id } });
      await tx.bolsaoUsuario.createMany({
        data: permissions.prioritario.map((userId: string) => ({
          bolsaoId: bolsaoPrioritario!.id,
          usuarioId: userId,
        })),
      });

      // Limpa permissões antigas e insere as novas para o bolsão geral
      await tx.bolsaoUsuario.deleteMany({ where: { bolsaoId: bolsaoGeral!.id } });
      await tx.bolsaoUsuario.createMany({
        data: permissions.geral.map((userId: string) => ({
          bolsaoId: bolsaoGeral!.id,
          usuarioId: userId,
        })),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 });
  }
}
