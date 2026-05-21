import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Redis } from "@upstash/redis";

/**
 * GET /api/health
 * Health check endpoint que verifica a conectividade com DB e Redis.
 */
export async function GET() {
  const services: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // 1. Verificar banco de dados (Supabase PostgreSQL)
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    services.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (error) {
    services.db = { ok: false, error: String(error) };
  }

  // 2. Verificar Redis (Upstash)
  try {
    if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
      const redisStart = Date.now();
      const redis = new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN,
      });
      await redis.ping();
      services.redis = { ok: true, latencyMs: Date.now() - redisStart };
    } else {
      services.redis = { ok: false, error: "REDIS_URL or REDIS_TOKEN not configured" };
    }
  } catch (error) {
    services.redis = { ok: false, error: String(error) };
  }

  const allOk = Object.values(services).every((s) => s.ok);

  return NextResponse.json(
    {
      ok: allOk,
      timestamp: new Date().toISOString(),
      services,
    },
    { status: allOk ? 200 : 503 }
  );
}
