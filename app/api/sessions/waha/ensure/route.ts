import { NextResponse } from "next/server";
import { WahaAdapter } from "@/lib/channels/waha";

export async function POST(req: Request) {
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
