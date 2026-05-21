import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/agents/[id] — Retorna uma AgentSession específica
 * PUT /api/agents/[id] — Atualiza uma AgentSession
 * DELETE /api/agents/[id] — Remove uma AgentSession
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agentSession.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("🔥 Erro no GET /api/agents/[id]:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    // Se está sendo marcado como default, desmarcar todos os outros
    if (body.isDefault) {
      await prisma.agentSession.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const agent = await prisma.agentSession.update({
      where: { id: params.id },
      data: {
        name: body.name,
        systemPrompt: body.systemPrompt,
        initiationStrategy: body.initiationStrategy,
        qualificationBoundary: body.qualificationBoundary,
        targetFunnelStage: body.targetFunnelStage,
        model: body.model,
        provider: body.provider,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        memoryMode: body.memoryMode,
        tools: body.tools,
        isDefault: body.isDefault,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("🔥 Erro no PUT /api/agents/[id]:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.agentSession.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("🔥 Erro no DELETE /api/agents/[id]:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
