import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';
import { sanitizeDashboardConfig } from '@/lib/dashboard-config';
import { loadFunnels, loadSavedDashboardConfig, resolveDashboardConfig, saveDashboardConfig } from '@/lib/dashboard-config.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const [funnels, saved] = await Promise.all([loadFunnels(), loadSavedDashboardConfig(user)]);
    const { config, isDefault } = resolveDashboardConfig(saved, funnels);
    return NextResponse.json({ config, isDefault, funnels });
  } catch (error) {
    console.error('Erro ao buscar configuração do dashboard:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== Role.MARKETING_ADMIN) {
      return NextResponse.json({ error: 'Apenas o administrador configura o dashboard.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const funnels = await loadFunnels();
    const config = sanitizeDashboardConfig(body, funnels);
    await saveDashboardConfig(user, config);

    return NextResponse.json({ config, isDefault: false, funnels });
  } catch (error) {
    console.error('Erro ao salvar configuração do dashboard:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
