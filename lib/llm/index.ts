import { prisma } from "@/lib/prisma";
import { sendTextViaWaha } from "./waha-sender";
import { sendSlackSDRNotification } from "@/lib/slack";
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
      agent: true,
      broadcast: { select: { id: true, aiSystemPrompt: true, name: true } },
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

  const isBroadcastConversation = !!conversation.broadcastId && !!conversation.broadcast?.aiSystemPrompt;

  const session =
    !isBroadcastConversation
      ? conversation.agent ||
        (await prisma.agentSession.findFirst({ where: { isDefault: true } }))
      : null;

  if (!isBroadcastConversation && !session) {
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
  const userTurnText = bufferedMessages.map((m) => m.content).join("\n");

  // Informações do lead do CRM (se vinculado)
  const crmClient = conversation.contact?.crmClient;
  const clientContext = crmClient
    ? `\n[CONTEXTO DO LEAD NO CRM]\nNome: ${crmClient.fullName}\nTelefone: ${crmClient.phone || "N/A"}\nID CRM: ${crmClient.id}`
    : "\n[LEAD NOVO — Ainda não cadastrado no CRM]";

  // Prompt de sistema: broadcast tem prompt próprio, SDR usa AgentSession
  const systemPromptCompleto = isBroadcastConversation
    ? `${conversation.broadcast!.aiSystemPrompt}
${clientContext}

[REGRAS GERAIS]
- Responda SEMPRE em português do Brasil (pt-BR)
- Use linguagem profissional, empática e objetiva
- NÃO invente informações sobre imóveis, preços ou condições
- Se não souber algo, diga que vai verificar com a equipe
- Use emojis com moderação e profissionalismo
- Quando o lead confirmar interesse ou fornecer as informações solicitadas, chame a ferramenta "qualify_lead" com um resumo do que foi coletado.`
    : `${session!.systemPrompt}
${clientContext}

[DIRETRIZES DE ABORDAGEM E INÍCIO DE CONVERSA]
${session!.initiationStrategy}

[BARREIRA DE QUALIFICAÇÃO / TETO OPERACIONAL]
Você é um SDR e deve interagir APENAS até cumprir este objetivo: ${session!.qualificationBoundary}.
Assim que coletar essas informações ou o cliente atingir esse ponto, você DEVE encerrar a conversa com uma frase de despedida profissional indicando que um consultor especializado entrará em contato. NÃO invente novos tópicos e não responda mais perguntas após cumprir a meta.

[REGRAS GERAIS]
- Responda SEMPRE em português do Brasil (pt-BR)
- Use linguagem profissional, empática e objetiva
- NÃO invente informações sobre imóveis, preços ou condições
- Se não souber algo, diga que vai verificar com a equipe
- Use emojis com moderação e profissionalismo
- OBRIGATÓRIO: Quando o lead fornecer as informações necessárias do teto operacional, chame a ferramenta (tool) "qualify_lead" informando o resumo do que foi coletado.`;

  // Parâmetros do modelo — broadcast usa defaults, SDR usa AgentSession
  const modelName   = session?.model       ?? "llama3-70b-8192";
  const temperature = session?.temperature ?? 0.7;
  const maxTokens   = session?.maxTokens   ?? 512;
  const memoryWindow = session ? parseInt(session.memoryMode.replace("window_", "")) || 20 : 10;
  const historicoDB = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: memoryWindow,
  });

  const messagesPayload: GroqMessage[] = [
    { role: "system", content: systemPromptCompleto },
    ...historicoDB.map((m) => ({
      role: m.role as GroqMessage["role"],
      content: m.content,
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
        model: modelName,
        messages: messagesPayload,
        temperature,
        max_tokens: maxTokens,
        tools: [
          {
            type: "function",
            function: {
              name: "qualify_lead",
              description: "Deve ser chamada APENAS e IMEDIATAMENTE quando o lead atinge o objetivo de qualificação estipulado (Teto Operacional). Mova o lead para a próxima etapa do funil.",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Resumo em um parágrafo das informações essenciais coletadas do lead (nome, orçamento, preferências, etc.)"
                  }
                },
                required: ["summary"]
              }
            }
          }
        ],
        tool_choice: "auto"
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
    const messageObj = data.choices[0].message;
    const replyText: string = messageObj.content || "";
    const toolCalls = messageObj.tool_calls || [];
    const tokensIn: number = data.usage?.prompt_tokens || 0;
    const tokensOut: number = data.usage?.completion_tokens || 0;

    console.log(
      JSON.stringify({
        event: "llm.response",
        conversationId,
        model: modelName,
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
        content: replyText || "[Tool Call]",
        modelUsed: session?.model ?? modelName,
        tokensIn,
        tokensOut,
      },
    });

    // 2. Lidar com Tool Calls (Gatilho 2)
    if (toolCalls.length > 0) {
      for (const tool of toolCalls) {
        if (tool.function.name === "qualify_lead") {
          const args = JSON.parse(tool.function.arguments || "{}");
          
          // Encerrar o atendimento da IA
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { 
              status: "qualified",
              aiEnabled: false 
            }
          });

          // Enviar pro Slack
          const leadName = crmClient?.fullName || conversation.contact.name || "Desconhecido";
          await sendSlackSDRNotification(
            `✅ *Lead Qualificado pelo Bot SDR!*\nO cliente *${leadName}* atingiu o objetivo de qualificação e o bot encerrou o atendimento automático.\n\n*Resumo coletado:* ${args.summary || "Sem resumo."}`
          );
        }
      }
    }

    // Atualizar lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Enviar a mensagem de volta para o cliente pelo canal Waha
    if (replyText) {
      await sendTextViaWaha(bufferedMessages[0].contactId, replyText);
    }
  } catch (error) {
    console.error(
      JSON.stringify({ event: "llm.fatal_error", error: String(error) })
    );
  }
}
