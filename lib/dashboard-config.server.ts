// lib/dashboard-config.server.ts
import { prisma } from '@/lib/prisma';
import type { UserPayload } from '@/lib/auth';
import { defaultDashboardConfig, sanitizeDashboardConfig, type DashboardConfig, type FunnelInfo } from '@/lib/dashboard-config';

// Guardado como JSON em api_settings, por conta — mesmo esquema de ROLE_SETTINGS.
const SETTING_KEY = 'DASHBOARD_CONFIG';

type AccountUser = Pick<UserPayload, 'id' | 'accountId'>;

const accountKey = (user: AccountUser) => user.accountId ?? user.id;

export async function loadFunnels(): Promise<FunnelInfo[]> {
  return prisma.funnel.findMany({
    select: { id: true, name: true, stages: { select: { id: true, name: true, order: true }, orderBy: { order: 'asc' } } },
    orderBy: { name: 'asc' },
  });
}

/** JSON salvo pelo admin, ainda sem validar. null = nunca salvou. */
export async function loadSavedDashboardConfig(user: AccountUser): Promise<string | null> {
  const saved = await prisma.apiSetting.findFirst({
    where: { setting_key: SETTING_KEY, user_id: accountKey(user) },
    select: { encrypted_value: true },
  });
  return saved?.encrypted_value ?? null;
}

export function resolveDashboardConfig(saved: string | null, funnels: FunnelInfo[]): { config: DashboardConfig; isDefault: boolean } {
  if (saved) {
    try {
      return { config: sanitizeDashboardConfig(JSON.parse(saved), funnels), isDefault: false };
    } catch {
      // JSON corrompido: cai no padrão em vez de derrubar o dashboard.
    }
  }
  return { config: defaultDashboardConfig(funnels), isDefault: true };
}

export async function saveDashboardConfig(user: AccountUser, config: DashboardConfig) {
  const encoded = JSON.stringify(config);
  const saved = await prisma.apiSetting.findFirst({ where: { setting_key: SETTING_KEY, user_id: accountKey(user) } });
  if (saved) {
    await prisma.apiSetting.update({ where: { id: saved.id }, data: { encrypted_value: encoded } });
  } else {
    await prisma.apiSetting.create({ data: { setting_key: SETTING_KEY, encrypted_value: encoded, user_id: accountKey(user) } });
  }
}
