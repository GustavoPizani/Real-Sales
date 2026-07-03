import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    webhookConfigured: Boolean(process.env.SLACK_LEAD_WEBHOOK_URL),
  });
}
