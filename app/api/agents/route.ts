import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/agents — Lista todas as AgentSessions
 * POST /api/agents — Cria uma nova AgentSession
 */
export async function GET() {
  try {
    const agents = await prisma.agentSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const agent = await prisma.agentSession.create({
      data: {
        name: body.name,
        systemPrompt: body.systemPrompt || "",
        initiationStrategy: body.initiationStrategy || "",
        qualificationBoundary: body.qualificationBoundary || "",
        targetFunnelStage: body.targetFunnelStage || "lead_qualificado",
        model: body.model || "llama3-70b-8192",
        provider: body.provider || "groq",
        temperature: body.temperature ?? 0.3,
        maxTokens: body.maxTokens ?? 1024,
        memoryMode: body.memoryMode || "window_20",
        tools: body.tools || [],
        isDefault: body.isDefault ?? false,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
