import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS" },
  });
}

export async function POST(request: NextRequest) {
  // Accept both JSON and form-encoded bodies
  const ct = request.headers.get("content-type") ?? "";
  let grantType: string | null = null;
  let code: string | null = null;
  let codeVerifier: string | null = null;

  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await request.text());
    grantType = params.get("grant_type");
    code = params.get("code");
    codeVerifier = params.get("code_verifier");
  } else {
    const body = await request.json().catch(() => ({})) as Record<string, string>;
    grantType = body.grant_type ?? null;
    code = body.code ?? null;
    codeVerifier = body.code_verifier ?? null;
  }

  if (grantType !== "authorization_code" || !code) {
    return NextResponse.json(
      { error: "invalid_grant" },
      { status: 400, headers: cors }
    );
  }

  try {
    const apiKey = process.env.MCP_API_KEY ?? "default";
    const dotIdx = code.lastIndexOf(".");
    const payloadB64 = code.slice(0, dotIdx);
    const sig = code.slice(dotIdx + 1);

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    // Verify HMAC signature
    const expected = crypto
      .createHmac("sha256", apiKey)
      .update(JSON.stringify(payload))
      .digest("base64url");

    if (sig !== expected) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: cors });
    }

    // Check expiry
    if (Date.now() > payload.exp) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Code expired" },
        { status: 400, headers: cors }
      );
    }

    // Verify PKCE if the code had a challenge
    if (payload.codeChallenge && codeVerifier) {
      const computed = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
      if (computed !== payload.codeChallenge) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "PKCE failed" },
          { status: 400, headers: cors }
        );
      }
    }

    // The access token IS the MCP_API_KEY — the MCP route already validates it
    return NextResponse.json(
      {
        access_token: apiKey,
        token_type: "Bearer",
        expires_in: 60 * 60 * 24 * 30, // 30 days
        scope: "mcp",
      },
      { headers: cors }
    );
  } catch {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: cors });
  }
}
