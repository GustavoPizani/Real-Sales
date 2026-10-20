// lib/llm/models.ts
// Modelo da Groq usado em todo o sistema (importar imóvel por texto, sugestão da
// RIA e agentes SDR do WhatsApp). Num lugar só para que a próxima troca de
// modelo seja uma linha — ou só a variável GROQ_MODEL na Vercel, sem deploy de código.

/**
 * Padrão: gpt-oss-120b. Em out/2026 a Groq retirou os modelos Llama 3 que o
 * sistema usava (llama3-70b-8192 e llama-3.3-70b-versatile), e toda chamada
 * passou a falhar com "model_not_found".
 */
export const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';

/** Opções oferecidas na tela de configurar agentes SDR. */
export const GROQ_MODEL_OPTIONS = [
  { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (recomendado)' },
  { value: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (mais rápido)' },
] as const;

// Famílias que a Groq já retirou. Agentes salvos no banco com um desses nomes
// passam a usar o modelo padrão em vez de falhar a cada mensagem.
const RETIRED_MODELS = /^(llama3-|llama-3|mixtral|gemma)/i;

export function resolveGroqModel(name?: string | null): string {
  return !name || RETIRED_MODELS.test(name) ? GROQ_MODEL : name;
}

/**
 * Os modelos gpt-oss "pensam" antes de responder, e esse raciocínio conta no
 * limite de tokens da resposta. Com esforço baixo ele fica curto e sobra espaço
 * para a resposta em si.
 */
export function reasoningOptions(model: string): { reasoning_effort?: 'low' } {
  return model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {};
}
