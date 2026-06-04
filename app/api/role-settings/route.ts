import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";

const SETTING_KEY = 'ROLE_SETTINGS';

const DEFAULT_SETTINGS = [
  { roleName: 'DIRECTOR', isActive: true },
  { roleName: 'MANAGER', isActive: true },
  { roleName: 'BROKER', isActive: true },
];

async function getAccountId(user: { id: string; accountId?: string | null }) {
  return user.accountId ?? user.id;
}

export async function GET() {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ settings: DEFAULT_SETTINGS });

  const accountId = await getAccountId(user);

  const saved = await prisma.apiSetting.findFirst({
    where: { setting_key: SETTING_KEY, user_id: accountId },
  }).catch(() => null);

  if (saved) {
    try {
      return NextResponse.json({ settings: JSON.parse(saved.encrypted_value) });
    } catch {}
  }

  return NextResponse.json({ settings: DEFAULT_SETTINGS });
}

export async function POST(request: Request) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { roleName, isActive } = await request.json();
  if (!roleName || typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'roleName e isActive são obrigatórios' }, { status: 400 });
  }

  const accountId = await getAccountId(user);

  const saved = await prisma.apiSetting.findFirst({
    where: { setting_key: SETTING_KEY, user_id: accountId },
  }).catch(() => null);

  let settings = [...DEFAULT_SETTINGS];
  if (saved) {
    try { settings = JSON.parse(saved.encrypted_value); } catch {}
  }

  settings = settings.map(s => s.roleName === roleName ? { ...s, isActive } : s);
  const encoded = JSON.stringify(settings);

  if (saved) {
    await prisma.apiSetting.update({
      where: { id: saved.id },
      data: { encrypted_value: encoded },
    });
  } else {
    await prisma.apiSetting.create({
      data: { setting_key: SETTING_KEY, encrypted_value: encoded, user_id: accountId },
    });
  }

  return NextResponse.json({ success: true, settings });
}
