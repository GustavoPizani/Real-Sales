import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const cors = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const apiKey = process.env.MCP_API_KEY ?? "default";

  // Derive stable client_id and secret from our API key — stateless, no DB needed
  const clientId =
    "mcp_" +
    crypto.createHmac("sha256", apiKey).update("client_id").digest("hex").slice(0, 16);

  const clientSecret = crypto
    .createHmac("sha256", apiKey)
    .update("client_secret")
    .digest("hex");

  return NextResponse.json(
    {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: (body.redirect_uris as string[]) ?? [],
      client_name: (body.client_name as string) ?? "MCP Client",
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
    },
    { status: 201, headers: cors }
  );
}
