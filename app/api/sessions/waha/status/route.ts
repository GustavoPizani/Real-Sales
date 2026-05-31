import { NextResponse } from "next/server";
import { WahaAdapter } from "@/lib/channels/waha";

export async function GET(req: Request) {
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
