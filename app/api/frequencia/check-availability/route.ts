import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = format(now, 'HH:mm');

    const activeConfigs = await prisma.frequenciaConfig.findMany({
      where: { ativo: true, diasDaSemana: { has: currentDay } },
    });

    let currentValidSlot: { inicio: string; fim: string } | null = null;

    for (const config of activeConfigs) {
      const horarios = config.horarios as Array<{ inicio: string; fim: string }>;
      for (const horario of horarios) {
        if (currentTime >= horario.inicio && currentTime <= horario.fim) {
          currentValidSlot = horario;
          break;
        }
      }
      if (currentValidSlot) break;
    }

    if (!currentValidSlot) {
      return NextResponse.json({ available: false, reason: 'Fora do horário.' });
    }

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const existingRegistrationsToday = await prisma.frequenciaRegistro.findMany({
      where: { userId: user.id, createdAt: { gte: todayStart, lte: todayEnd } },
    });

    // ✅ LÓGICA 2: Verifica se o usuário já fez um registro no slot de horário atual.
    const hasRegisteredInCurrentSlot = existingRegistrationsToday.some(reg => {
        const regTime = format(parseISO(reg.createdAt.toISOString()), 'HH:mm');
        return regTime >= currentValidSlot!.inicio && regTime <= currentValidSlot!.fim;
    });

    return NextResponse.json({ available: !hasRegisteredInCurrentSlot });

  } catch (error) {
    console.error('Erro ao verificar disponibilidade de frequência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
