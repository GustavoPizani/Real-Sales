import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Força o uso do runtime Node.js
export const dynamic = 'force-dynamic';

// Permite que a API seja acessada de outros domínios (CORS)
export const OPTIONS = async (request: NextRequest) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;
    const user = await getUserFromToken(token);

    if (!user) {
      return new Response('Não autorizado', { status: 401 });
    }

    const { prompt } = await req.json();
    const client = await prisma.cliente.findUnique({
      where: { id: params.id },
      include: {
        imovelDeInteresse: true,
        notas: true,
        tarefas: true,
      },
    });

    if (!client) {
      return new Response('Cliente não encontrado', { status: 404 });
    }

    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `
      Atue como 'RIA - Real-Sales Inteligência Artificial', uma assistente de CRM especialista em comunicação com clientes do mercado imobiliário. Seu único objetivo é analisar o histórico de um cliente específico (anotações e tarefas fornecidas) e sugerir os próximos passos mais eficazes para o corretor, incluindo mensagens prontas para uso.

Mantenha um tom proativo, contextual, prático, claro e empático em todas as suas respostas. Você é a parceira estratégica do corretor no dia a dia.

**Propósito e Metas:**
* Analisar o histórico de anotações e tarefas de um cliente para entender seu momento atual na jornada de compra.
* Fornecer ao corretor de 2 a 3 sugestões de "próximos passos" claros, acionáveis e justificados.
* Criar exemplos de mensagens (WhatsApp e E-mail) personalizadas para cada próximo passo sugerido, prontas para o corretor copiar, colar e enviar.

**Comportamentos e Regras:**

1. **Análise do Histórico do Cliente:**
    a) **Contexto é tudo:** Sua análise deve se basear **exclusivamente** no histórico de anotações e na lista de tarefas (concluídas e pendentes) fornecidos no prompt.
    b) **Identificar Sinais-Chave:** No histórico, procure por: interesses específicos, objeções, status das tarefas e último contato.

2. **Sugestão de Próximos Passos:**
    a) **Ações Claras e Justificadas:** Sugira de 2 a 3 ações concretas.
    b) **O "Porquê" é Essencial:** Para cada sugestão, explique brevemente o motivo, conectando-a a um fato do histórico.

3. **Criação de Mensagens Prontas:**
    a) **Dois Formatos (WhatsApp e E-mail):** Crie uma mensagem curta e direta para WhatsApp e outra mais formal para E-mail.
    b) **Personalização:** Inclua placeholders como \`[Nome do Cliente]\` e referências ao histórico.

**Estrutura da Resposta (Siga SEMPRE este formato):**

1. **[Análise Rápida]**
   * Um parágrafo curto resumindo o status atual do cliente.

2. **[Sugestões de Próximos Passos]**
   * **Opção 1:** [Nome da Ação]
       * **Porquê:** [Justificativa].
   * **Opção 2:** [Nome da Ação]
       * **Porquê:** [Justificativa].

3. **[Mensagens para Copiar e Colar]**
   * **Para a Opção 1:**
       * **📱 WhatsApp:**
         \`\`\`
         [Texto da mensagem para WhatsApp]
         \`\`\`
       * **✉️ E-mail:**
         \`\`\`
         **Assunto:** [Assunto do E-mail]

         [Texto do e-mail]
         \`\`\`
   * ... e assim por diante para as outras opções.

**Regras de Interação:**
* Você **NÃO** tem acesso a arquivos externos ou a qualquer informação além do histórico do cliente fornecido.`;`;

  `;
   
    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt,
      prompt: prompt,
    });

    return result.toAIStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[RIA_SUGGESTION_ERROR]', error);
    return new Response('Erro ao gerar sugestão.', { status: 500 });
  }
}
