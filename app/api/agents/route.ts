import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getUserFromToken } from "@/lib/auth";
import { resolveGroqModel } from "@/lib/llm/models";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/agents — Lista todas as AgentSessions
 * POST /api/agents — Cria uma nova AgentSession
 */
export async function GET() {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== Role.MARKETING_ADMIN) return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
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
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== Role.MARKETING_ADMIN) return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  try {
    const body = await req.json();

    const agent = await prisma.agentSession.create({
      data: {
        name: body.name,
        systemPrompt: body.systemPrompt || "",
        initiationStrategy: body.initiationStrategy || "",
        qualificationBoundary: body.qualificationBoundary || "",
        targetFunnelStage: body.targetFunnelStage || "lead_qualificado",
        model: resolveGroqModel(body.model),
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
