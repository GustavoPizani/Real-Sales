import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getUserFromToken } from "@/lib/auth";
import { WahaAdapter } from "@/lib/channels/waha";

export async function POST(req: Request) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== Role.MARKETING_ADMIN) return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  try {
    const { sessionName = "default" } = await req.json().catch(() => ({}));
    
    const waha = new WahaAdapter();
    const result = await waha.ensureSession(sessionName);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
