import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getUserFromToken } from "@/lib/auth";
import { WahaAdapter } from "@/lib/channels/waha";

export async function GET(req: Request) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== Role.MARKETING_ADMIN) return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const sessionName = searchParams.get("session") || "default";
    
    const waha = new WahaAdapter();
    const result = await waha.getSessionStatus(sessionName);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
