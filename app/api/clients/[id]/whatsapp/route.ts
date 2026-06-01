import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTextViaWaha } from "@/lib/llm/waha-sender";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { agentId, message } = await request.json() as {
      agentId?: string;
      message: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensagem não pode ser vazia" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      select: { id: true, fullName: true, phone: true, sdrContact: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!client.phone) {
      return NextResponse.json({ error: "Cliente sem telefone cadastrado" }, { status: 400 });
    }

    // Format phone → WhatsApp chatId
    const raw = client.phone.replace(/\D/g, "");
    const phone = raw.startsWith("55") && raw.length >= 12 ? raw : `55${raw}`;
    const chatId = `${phone}@c.us`;

    // Send via Waha
    await sendTextViaWaha(chatId, message);

    // Find or create Contact linked to this CRM client
    let contact = client.sdrContact;

    if (!contact) {
      // Check if a contact with this phone already exists
      const existing = await prisma.contactIdentity.findUnique({
        where: { channel_identifier: { channel: "whatsapp", identifier: phone } },
        include: { contact: true },
      });

      if (existing) {
        contact = existing.contact;
        // Link to CRM client if not linked yet
        if (!contact.crmClientId) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { crmClientId: client.id },
          });
        }
      } else {
        contact = await prisma.contact.create({
          data: {
            name: client.fullName,
            crmClientId: client.id,
            identities: {
              create: { channel: "whatsapp", identifier: phone },
            },
          },
        });
      }
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        agentId: agentId || null,
        channel: "waha",
        status: "active",
        aiEnabled: !!agentId,
        lastMessageAt: new Date(),
      },
    });

    // Record the outbound message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        role: "assistant",
        content: message.trim(),
      },
    });

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (error) {
    console.error("whatsapp/start error:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem" },
      { status: 500 }
    );
  }
}
