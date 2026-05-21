import { prisma } from "@/lib/prisma";
import { sendTextViaWaha } from "./waha-sender";
import type { NormalizedMessage } from "@/lib/debounce";

/**
 * Orquestrador LLM via Groq API
 *
 * Compõe dinamicamente o prompt do SDR com:
 * 1. System prompt base da AgentSession
 * 2. Estratégia de abordagem (initiationStrategy)
 * 3. Teto operacional (qualificationBoundary)
 * 4. Histórico recente da conversa (window_20)
 *
 * Após a resposta, salva no banco e envia via Waha.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export async function flushToLLM(
  bufferedMessages: NormalizedMessage[],
  conversationId: string
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      agentSession: true,
      contact: {
        include: {
          crmClient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              funnelStageId: true,
              funnelId: true,
            },
          },
        },
      },
    },
  });

  if (!conversation || !conversation.aiEnabled) return;

  const session =
    conversation.agentSession ||
    (await prisma.agentSession.findFirst({ where: { isDefault: true } }));

  if (!session) {
    console.error(
      JSON.stringify({
        event: "llm.no_session",
        conversationId,
        message: "Nenhuma AgentSession padrão configurada",
      })
    );
    return;
  }

  // Junta as mensagens recebidas na janela de 5 segundos
  const userTurnText = bufferedMessages.map((m) => m.text).join("\n");

  // Informações do lead do CRM (se vinculado)
  const crmClient = conversation.contact?.crmClient;
  const clientContext = crmClient
    ? `\n[CONTEXTO DO LEAD NO CRM]\nNome: ${crmClient.fullName}\nTelefone: ${crmClient.phone || "N/A"}\nID CRM: ${crmClient.id}`
    : "\n[LEAD NOVO — Ainda não cadastrado no CRM]";

  // COMPOSIÇÃO MODULAR OBRIGATÓRIA DO PROMPT DO SDR
  const systemPromptCompleto = `${session.systemPrompt}
${clientContext}

[DIRETRIZES DE ABORDAGEM E INÍCIO DE CONVERSA]
${session.initiationStrategy}

[BARREIRA DE QUALIFICAÇÃO / TETO OPERACIONAL]
Você é um SDR e deve interagir APENAS até cumprir este objetivo: ${session.qualificationBoundary}.
Assim que coletar essas informações ou o cliente atingir esse ponto, você DEVE encerrar a conversa com uma frase de despedida profissional indicando que um consultor especializado entrará em contato. NÃO invente novos tópicos e não responda mais perguntas após cumprir a meta.

[REGRAS GERAIS]
- Responda SEMPRE em português do Brasil (pt-BR)
- Use linguagem profissional, empática e objetiva
- NÃO invente informações sobre imóveis, preços ou condições
- Se não souber algo, diga que vai verificar com a equipe
- Mantenha as respostas concisas (máx 3 parágrafos)
- Use emojis com moderação e profissionalismo`;

  // Resgatar histórico recente da conversa
  const memoryWindow = parseInt(session.memoryMode.replace("window_", "")) || 20;
  const historicoDB = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: memoryWindow,
  });

  const messagesPayload: GroqMessage[] = [
    { role: "system", content: systemPromptCompleto },
    ...historicoDB.map((m) => ({
      role: m.role as GroqMessage["role"],
      content: m.text,
    })),
    { role: "user", content: userTurnText },
  ];

  try {
    // Chamada de API para o Groq
    const startTime = Date.now();
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: session.model,
        messages: messagesPayload,
        temperature: session.temperature,
        max_tokens: session.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        JSON.stringify({
          event: "llm.groq_error",
          status: response.status,
          error: errorText,
        })
      );
      return;
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    const replyText: string = data.choices[0].message.content;
    const tokensIn: number = data.usage?.prompt_tokens || 0;
    const tokensOut: number = data.usage?.completion_tokens || 0;

    console.log(
      JSON.stringify({
        event: "llm.response",
        conversationId,
        model: session.model,
        latencyMs,
        tokensIn,
        tokensOut,
      })
    );

    // Salvar resposta da IA no banco do Supabase
    await prisma.message.create({
      data: {
        conversationId,
        direction: "outbound",
        role: "assistant",
        text: replyText,
        modelUsed: session.model,
        tokensIn,
        tokensOut,
      },
    });

    // Atualizar lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Enviar a mensagem de volta para o cliente pelo canal Waha
    await sendTextViaWaha(bufferedMessages[0].contactId, replyText);
  } catch (error) {
    console.error(
      JSON.stringify({ event: "llm.fatal_error", error: String(error) })
    );
  }
}
