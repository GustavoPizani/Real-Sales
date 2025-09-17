import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';
import { haversineDistance, isTimeWithinIntervals } from '@/lib/geolocation';
import { z } from 'zod';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET: Retorna registos de frequência
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdFilter = searchParams.get('userId');
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');   // YYYY-MM-DD

    const where: any = {};

    if (user.role === Role.corretor || user.role === Role.gerente) {
      where.userId = user.id;
    } else if (userIdFilter) {
      where.userId = userIdFilter;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'), // End of day
      };
    }

    const registros = await prisma.frequenciaRegistro.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            role: true,
          },
        },
        config: { // ✅ Inclui os dados da configuração associada
          select: { nome: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(registros);
  } catch (error) {
    console.error('Erro ao buscar registos de frequência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Cria um novo registo de frequência (corretor/gerente)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const user = await getUserFromToken(token);

    const body = await request.json();

    // Validação dos dados de entrada com Zod
    const registroSchema = z.object({
      latitude: z.number({ required_error: "Latitude é obrigatória." }),
      longitude: z.number({ required_error: "Longitude é obrigatória." }),
      userId: z.string().optional(), // ✅ Adicionado para registro manual
      horarioManual: z.string().optional(), // ✅ Adicionado para o horário do registro manual
    });

    const { latitude, longitude } = registroSchema.parse(body);

    let targetUserId = user.id;
    // Se um userId for fornecido e o usuário for admin, use esse ID.
    if (body.userId && user.role === Role.marketing_adm) {
      targetUserId = body.userId;
    } else if (![Role.corretor, Role.gerente, Role.marketing_adm].includes(user.role)) {
      return NextResponse.json({ error: 'Não autorizado para registar frequência' }, { status: 403 });
    }

    // ✅ Se for um registro manual com horário, usa a data atual com a hora fornecida
    let registrationTime = new Date();
    if (body.horarioManual && user.role === Role.marketing_adm) {
        const [hours, minutes] = body.horarioManual.split(':').map(Number);
        registrationTime.setHours(hours, minutes, 0, 0);
    }

    // 1. Encontrar configurações de frequência ativas
    const activeConfigs = await prisma.frequenciaConfig.findMany({
      where: { ativo: true },
    });

    let distancia = -1;
    let dentroDoRaio = false;
    let configFound = false;
    let matchedConfigId: string | null = null;

    for (const config of activeConfigs) {
      // ✅ CORREÇÃO: Verifica se o horário atual está dentro de algum dos intervalos configurados
      const horarios = config.horarios as Array<{ inicio: string; fim: string }>;
      const now = registrationTime; // Usa o tempo de registro (manual ou atual)
      const currentDay = now.getDay(); // Pega o dia da semana (0-6)
      const currentTime = format(now, 'HH:mm'); // Pega a hora (HH:mm)

      const isWithinSchedule = config.diasDaSemana.includes(currentDay) && horarios.some(h => currentTime >= h.inicio && currentTime <= h.fim);

      if (!isWithinSchedule) {
        continue; // Skip if outside time interval for this config
      }
      
      configFound = true;
      const calculatedDistance = haversineDistance(
        config.latitude,
        config.longitude,
        latitude,
        longitude
      );
      distancia = calculatedDistance;

      if (calculatedDistance <= config.raio) {
        dentroDoRaio = true;
        matchedConfigId = config.id; // ✅ Salva o ID da configuração correspondente
        break; // Found a matching active config within radius and time, no need to check others
      }
    }

    if (!configFound) {
        return NextResponse.json({ error: 'Nenhuma configuração de frequência ativa encontrada para o horário atual.' }, { status: 400 });
    }

    const newRegistro = await prisma.frequenciaRegistro.create({
      data: {
        userId: targetUserId,
        latitude,
        longitude,
        distancia,
        dentroDoRaio,
        configId: matchedConfigId, // ✅ Adiciona o ID ao criar o registro
        createdAt: registrationTime, // ✅ Usa o tempo de registro definido
      },
    });

    return NextResponse.json(newRegistro, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos.', issues: error.errors }, { status: 400 });
    }
    console.error('Erro ao criar registo de frequência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
