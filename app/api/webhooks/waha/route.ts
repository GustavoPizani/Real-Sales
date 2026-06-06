import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueForDebounce } from "@/lib/debounce";
import { sendSlackSDRNotification } from "@/lib/slack";

/**
 * POST /api/webhooks/waha
 * Endpoint de entrada para mensagens do WhatsApp via Waha (Railway).
 * Implementa: validação de API key, dedup de rede, busca antiduplicação
 * por phone suffix no CRM, e enfileiramento no debounce Redis.
 */
export async function POST(req: Request) {
  try {
    // 0. Validação da API Key (proteção interna)
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.WAHA_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Filtrar apenas eventos de mensagem
    if (body.event !== "message") {
      return NextResponse.json({ ok: true, skipped: body.event });
    }

    const msgData = body.payload;
    const externalId: string = msgData.from; // Ex: 5511999999999@c.us
    const text: string = msgData.body;
    const providerMsgId: string = msgData.id;

    // Ignorar mensagens de saída (enviadas pelo próprio bot)
    if (msgData.fromMe) {
      return NextResponse.json({ ok: true, skipped: "outbound" });
    }

    // 1. Evitar re-processamento por duplicidade de rede
    const existingMsg = await prisma.message.findUnique({
      where: { providerMsgId },
    });
    if (existingMsg) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    let identity = await prisma.contactIdentity.findUnique({
      where: { channel_identifier: { channel: "waha", identifier: externalId } },
      include: { contact: true },
    });

    if (!identity) {
      // 3. SE NÃO EXISTIR IDENTIDADE: Extrair dígitos limpos p/ busca global no CRM
      const cleanPhone = externalId.replace(/\D/g, ""); // Remove letras e @c.us
      const phoneSuffix = cleanPhone.slice(-8); // Últimos 8 dígitos (evita erros de nono dígito)

      // Busca na tabela Client existente do CRM (campo `phone`)
      const existingCrmClient = await prisma.client.findFirst({
        where: { phone: { contains: phoneSuffix } },
      });

      let contact;
      if (existingCrmClient) {
        // Verifica se já existe um Contact vinculado a este Client
        const existingContact = await prisma.contact.findUnique({
          where: { crmClientId: existingCrmClient.id },
        });

        if (existingContact) {
          contact = existingContact;
        } else {
          // Vincula o canal de WhatsApp ao Client existente do CRM
          contact = await prisma.contact.create({
            data: {
              name: msgData.notifyName || cleanPhone,
              crmClientId: existingCrmClient.id,
            },
          });
        }
      } else {
        // Lead totalmente novo que veio do tráfego direto do WhatsApp
        contact = await prisma.contact.create({
          data: { name: msgData.notifyName || cleanPhone },
        });
      }

      identity = await prisma.contactIdentity.create({
        data: { channel: "waha", identifier: externalId, contactId: contact.id },
        include: { contact: true },
      });
    }

    // 4. Buscar ou Criar Conversa Ativa
    let conversation = await prisma.conversation.findFirst({
      where: { contactId: identity.contactId, channel: "waha" },
    });

    if (!conversation) {
      const defaultSession = await prisma.agentSession.findFirst({
        where: { isDefault: true },
      });

      // Verificar se este número pertence a uma campanha de broadcast com IA ativa
      const cleanPhone = externalId.replace(/\D/g, "");
      const phoneSuffix = cleanPhone.slice(-11);
      const broadcastContact = await prisma.whatsappBroadcastContact.findFirst({
        where: {
          phone: { endsWith: phoneSuffix },
          status: "SENT",
          broadcast: { status: { in: ["ACTIVE", "FINISHED"] } },
        },
        include: { broadcast: { select: { id: true, aiSystemPrompt: true, aiEnabled: true } } },
        orderBy: { sentAt: "desc" },
      });

      conversation = await prisma.conversation.create({
        data: {
          contactId: identity.contactId,
          channel: "waha",
          agentSessionId: defaultSession?.id || null,
          ...(broadcastContact
            ? { broadcastId: broadcastContact.broadcast.id, aiEnabled: broadcastContact.broadcast.aiEnabled }
            : {}),
        },
      });

      await sendSlackSDRNotification(
        `🚀 Novo lead capturado e Bot SDR iniciou o atendimento: ${identity.contact?.name ?? externalId}`
      );
    }

    // 5. Salvar a Mensagem Inbound no Banco
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "inbound",
        role: "user",
        content: text,
        providerMsgId,
      },
    });

    // 6. Atualizar lastMessageAt na conversa
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // 7. Se a IA estiver desabilitada para esta conversa, não enfileirar
    if (!conversation.aiEnabled) {
      return NextResponse.json({ ok: true, aiDisabled: true });
    }

    // 8. Enviar para a Fila do Debounce via Upstash Redis Serverless
    const normalizedMessage = {
      channel: "waha" as const,
      contactId: externalId,
      content: text,
      receivedAt: new Date().toISOString(),
    };

    await enqueueForDebounce(normalizedMessage, conversation.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      JSON.stringify({ event: "webhook.waha.error", error: String(error) })
    );
    // Retorna 200 para evitar que o Waha bloqueie o webhook por erros
    return NextResponse.json({
      ok: true,
      error: "Internal processing bypassed to avoid webhook blocks",
    });
  }
}
