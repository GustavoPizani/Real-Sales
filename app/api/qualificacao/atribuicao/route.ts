import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role, StatusQualificacao } from '@prisma/client';
import { haversineDistance } from '@/lib/geolocation';

export const dynamic = 'force-dynamic';

// GET: Retorna os leads para atribuição do usuário logado
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // 1. Leads qualificados diretamente para o usuário
    const paraMim = await prisma.cliente.findMany({
      where: {
        qualificadoParaId: user.id,
        statusDeQualificacao: StatusQualificacao.Aguardando,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Leads nos bolsões permitidos
    const permissoes = await prisma.bolsaoUsuario.findMany({
      where: { usuarioId: user.id },
      include: { bolsao: true },
    });

    const bolsaoPrioritario = permissoes.some(p => p.bolsao.nome === 'Prioritário')
      ? await prisma.cliente.findMany({
          where: { statusDeQualificacao: StatusQualificacao.NoBolsaoPrioritario },
          orderBy: { entrouNoBolsaoEm: 'asc' },
        })
      : [];

    const bolsaoGeral = permissoes.some(p => p.bolsao.nome === 'Geral')
      ? await prisma.cliente.findMany({
          where: { statusDeQualificacao: StatusQualificacao.NoBolsaoGeral },
          orderBy: { entrouNoBolsaoEm: 'asc' },
        })
      : [];

    return NextResponse.json({ paraMim, bolsaoPrioritario, bolsaoGeral });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar leads para atribuição' }, { status: 500 });
  }
}

// POST: Atribui um lead a um corretor
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { leadId, userLatitude, userLongitude } = await request.json();
  if (!leadId || userLatitude === undefined || userLongitude === undefined) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Busca o lead e a configuração com lock para evitar race condition
      const lead = await tx.cliente.findUnique({
        where: { id: leadId },
      });

      const config = await tx.configuracaoBolsao.findFirst();
      if (!lead || !config) throw new Error('Lead ou configuração não encontrados.');

      // 2. Verifica se o lead já foi atribuído
      if (lead.statusDeQualificacao === StatusQualificacao.Atribuido) {
        throw new Error('Este lead já foi atribuído a outro corretor.');
      }

      // 3. Valida as regras de negócio
      const isLeadParaMim = lead.qualificadoParaId === user.id;
      
      // Se não for um lead direto, valida a geolocalização
      if (!isLeadParaMim) {
        const activeFrequencyLocations = await tx.frequenciaConfig.findMany({
          where: { ativo: true },
        });

        if (activeFrequencyLocations.length === 0) {
          throw new Error('Nenhum local de frequência ativo para validar a atribuição.');
        }

        const isWithinAnyRadius = activeFrequencyLocations.some(location => {
          const distancia = haversineDistance(
            location.latitude, location.longitude,
            userLatitude, userLongitude
          );
          return distancia <= location.raio;
        });

        if (!isWithinAnyRadius) {
          throw new Error(`Você não está dentro do raio de nenhum local de frequência ativo para realizar a atribuição.`);
        }
      }

      // 4. Atualiza o lead
      const updatedLead = await tx.cliente.update({
        where: { id: leadId },
        data: {
          corretorId: user.id,
          statusDeQualificacao: StatusQualificacao.Atribuido,
        },
      });

      return updatedLead;
    });

    return NextResponse.json({ success: true, message: 'Lead atribuído com sucesso!', lead: result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atribuir lead.' }, { status: 400 });
  }
}
