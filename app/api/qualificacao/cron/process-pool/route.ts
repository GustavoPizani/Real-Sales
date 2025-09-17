// Esta rota deve ser protegida por uma chave de API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StatusQualificacao } from '@prisma/client';
import { subMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  // Proteção da Rota
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date();
  const config = await prisma.configuracaoBolsao.findFirst();
  if (!config) return NextResponse.json({ error: 'Configuração não encontrada' });

  // 1. Move de 'Aguardando' para 'Prioritário'
  const timeLimitPrioritario = subMinutes(now, config.tempoAteBolsaoPrioritarioMinutos);
  await prisma.cliente.updateMany({
    where: {
      statusDeQualificacao: StatusQualificacao.Aguardando,
      createdAt: { lte: timeLimitPrioritario },
    },
    data: {
      statusDeQualificacao: StatusQualificacao.NoBolsaoPrioritario,
      entrouNoBolsaoEm: now,
      qualificadoParaId: null, // Libera o lead do corretor original
    },
  });

  // 2. Move de 'Prioritário' para 'Geral'
  const timeLimitGeral = subMinutes(now, config.tempoAteBolsaoGeralMinutos);
  await prisma.cliente.updateMany({
    where: {
      statusDeQualificacao: StatusQualificacao.NoBolsaoPrioritario,
      entrouNoBolsaoEm: { lte: timeLimitGeral },
    },
    data: {
      statusDeQualificacao: StatusQualificacao.NoBolsaoGeral,
    },
  });

  return NextResponse.json({ success: true, message: 'Bolsão de leads processado.' });
}
