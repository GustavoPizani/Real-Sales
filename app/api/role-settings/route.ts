// app/api/role-settings/route.ts

import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.roleSetting.findMany();
    // Garante que os cargos sempre existam
    if (settings.length < 2) {
        await prisma.roleSetting.upsert({ where: { roleName: 'diretor' }, update: {}, create: { roleName: 'diretor', isActive: true } });
        await prisma.roleSetting.upsert({ where: { roleName: 'gerente' }, update: {}, create: { roleName: 'gerente', isActive: true } });
        const newSettings = await prisma.roleSetting.findMany();
        return NextResponse.json({ settings: newSettings });
    }
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { roleName, isActive } = await request.json();
    const updatedSetting = await prisma.roleSetting.update({
      where: { roleName },
      data: { isActive },
    });
    return NextResponse.json(updatedSetting);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar cargo" }, { status: 500 });
  }
}
