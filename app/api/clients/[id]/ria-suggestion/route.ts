import { StreamingTextResponse, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

// 1. Definir tipos para os dados de entrada
const noteSchema = z.object({
  content: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});

const taskSchema = z.object({
  titulo: z.string(),
  concluida: z.boolean(),
  dataHora: z.string().datetime(),
});

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY_deepseek,
});

const riaSystemPrompt = `Atue como 'RIA - Real-Sales Inteligência Artificial', uma assistente de CRM especialista em comunicação com clientes do mercado imobiliário. Seu único objetivo é analisar o histórico de um cliente específico (anotações e tarefas fornecidas) e sugerir os próximos passos mais eficazes para o corretor, incluindo mensagens prontas para uso.

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
* Você **NÃO** tem acesso a arquivos externos ou a qualquer informação além do histórico do cliente fornecido.`;

export async function POST(request: Request) {
  try {
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return new Response('Não autorizado', { status: 401 });
    }

    // 2. Validar o corpo da requisição com Zod
    const bodySchema = z.object({
      clientName: z.string(),
      notes: z.array(noteSchema).optional(),
      tasks: z.array(taskSchema).optional(),
    });

    const { notes, tasks, clientName } = bodySchema.parse(await request.json());

    let clientHistory = `Histórico do Cliente: ${clientName}\n\n`;
    
    if (notes?.length > 0) {
      clientHistory += 'Anotações Recentes:\n';
      notes.forEach((note) => {
        clientHistory += `- "${note.content}" (Feita por ${note.createdBy} em ${new Date(note.createdAt).toLocaleDateString('pt-BR')})\n`;
      });
      clientHistory += '\n';
    }

    if (tasks?.length > 0) {
      clientHistory += 'Tarefas Relacionadas:\n';
      tasks.forEach((task) => {
        const status = task.concluida ? 'Concluída' : 'Pendente';
        clientHistory += `- ${task.titulo} (Status: ${status}, Vencimento: ${new Date(task.dataHora).toLocaleString('pt-BR')})\n`;
      });
    }

    const userMessage = `Por favor, analise o seguinte histórico e me forneça os próximos passos e mensagens.\n\n--- Histórico do Cliente ---\n${clientHistory}\n--- Fim do Histórico ---`;

    const result = await streamText({
      model: openrouter('deepseek/deepseek-chat'),
      system: riaSystemPrompt,
      prompt: userMessage,
      max_tokens: 1024,
      temperature: 0.7,
    });

    // 3. Remover comentário obsoleto
    return new StreamingTextResponse(result.textStream);

  } catch (error) {
    console.error('[RIA_SUGGESTION_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ message: 'Dados de entrada inválidos.', issues: error.issues }), { status: 400 });
    }
    return new Response('Erro ao obter sugestão da IA.', { status: 500 });
  }
}

// RIA = Real-Sales Inteligência Artificial
