import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getUserFromToken } from "@/lib/auth";

// Depende do login de quem chama: nunca pré-renderizar no build.
export const dynamic = "force-dynamic";
import { WahaAdapter } from "@/lib/channels/waha";

export async function POST(req: Request) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== Role.MARKETING_ADMIN) return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  try {
    const { sessionName = "default" } = await req.json().catch(() => ({}));
    const waha = new WahaAdapter();
    const result = await waha.logoutSession(sessionName);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
