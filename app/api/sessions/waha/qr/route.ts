import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getUserFromToken } from "@/lib/auth";

export async function GET() {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== Role.MARKETING_ADMIN) return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  const base = process.env.WAHA_BASE_URL;
  const key  = process.env.WAHA_API_KEY ?? "";

  if (!base) return NextResponse.json({ error: "WAHA_BASE_URL não configurado" }, { status: 503 });

  try {
    const res = await fetch(`${base}/api/default/auth/qr`, {
      headers: { "X-Api-Key": key, Accept: "image/png" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Waha retornou ${res.status}` }, { status: res.status });
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
