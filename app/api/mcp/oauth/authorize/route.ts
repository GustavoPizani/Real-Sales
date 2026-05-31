import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const clientId = searchParams.get("client_id");
  const codeChallenge = searchParams.get("code_challenge");

  if (!redirectUri || !clientId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const apiKey = process.env.MCP_API_KEY ?? "default";

  // Build a stateless signed auth code (no DB needed)
  const payload = JSON.stringify({
    clientId,
    redirectUri,
    codeChallenge: codeChallenge ?? null,
    exp: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  const sig = crypto
    .createHmac("sha256", apiKey)
    .update(payload)
    .digest("base64url");

  const code = Buffer.from(payload).toString("base64url") + "." + sig;

  // Auto-approve: redirect immediately back to claude.ai
  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);

  return NextResponse.redirect(callback.toString());
}
