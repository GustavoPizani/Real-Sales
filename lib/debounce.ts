import { Redis } from "@upstash/redis";
import { waitUntil } from "@vercel/functions";
import { flushToLLM } from "@/lib/llm";

/**
 * Debounce Serverless via Upstash Redis
 * 
 * Implementa uma sliding window de 5 segundos para agrupar múltiplas mensagens
 * rápidas do mesmo contato em uma única chamada ao LLM. Usa waitUntil do Vercel
 * para manter a função viva após retornar o response ao webhook.
 */

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    });
  }
  return redisClient;
}

export interface NormalizedMessage {
  channel: "waha";
  contactId: string;
  text: string;
  receivedAt: string;
}

export async function enqueueForDebounce(
  msg: NormalizedMessage,
  conversationId: string
) {
  const windowMs = 5000;
  const key = `debounce:waha:${msg.contactId}`;
  const lock = `${key}:lock`;
  const convKey = `${key}:conv`;
  const token = crypto.randomUUID();

  try {
    const redis = getRedis();

    // Adiciona a mensagem na lista temporária do contato
    await redis.rpush(key, JSON.stringify(msg));
    await redis.pexpire(key, windowMs * 4);

    // Salva o conversationId associado
    await redis.set(convKey, conversationId, { px: windowMs * 4 });

    // Seta a trava deslizante (Sliding Window)
    // Cada nova mensagem reseta a janela de espera
    await redis.set(lock, token, { px: windowMs });

    // Usa waitUntil para manter a função serverless viva
    // após o response ser enviado ao webhook
    waitUntil(
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            const redis = getRedis();
            const currentLock = await redis.get(lock);

            // Se o lock foi resetado por uma mensagem mais recente, aborta
            if (currentLock !== token) {
              resolve();
              return;
            }

            // Esta é a última mensagem da janela — processar o lote
            await redis.del(lock);
            const buffered = await redis.lrange(key, 0, -1);
            const savedConvId = await redis.get<string>(convKey);
            await redis.del(key);
            await redis.del(convKey);

            if (!buffered || buffered.length === 0) {
              resolve();
              return;
            }

            const messages: NormalizedMessage[] = buffered.map(
              (m: string | NormalizedMessage) =>
                typeof m === "string" ? JSON.parse(m) : m
            );

            // Agrupa todas as mensagens do lote e envia para o orquestrador do Groq
            await flushToLLM(messages, savedConvId || conversationId);
          } catch (err) {
            console.error(
              JSON.stringify({
                event: "debounce.flush_error",
                error: String(err),
              })
            );
          }
          resolve();
        }, windowMs + 50);
      })
    );
  } catch (err) {
    console.error(
      JSON.stringify({ event: "debounce.redis_fallback", error: String(err) })
    );
    // Fallback síncrono de segurança para nunca deixar o cliente no vácuo
    await flushToLLM([msg], conversationId);
  }
}
