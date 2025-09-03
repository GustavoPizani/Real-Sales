import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Inicializa o cliente para o provedor OpenRouter
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY_deepseek,
});

export const runtime = 'edge';

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

    const { notes, tasks, clientName } = await request.json();

    let clientHistory = `Histórico do Cliente: ${clientName}\n\n`;
    
    if (notes?.length > 0) {
      clientHistory += 'Anotações Recentes:\n';
      notes.forEach((note: any) => {
        clientHistory += `- "${note.content}" (Feita por ${note.createdBy} em ${new Date(note.createdAt).toLocaleDateString('pt-BR')})\n`;
      });
      clientHistory += '\n';
    } else {
      clientHistory += 'Nenhuma anotação recente.\n\n';
    }

    if (tasks?.length > 0) {
      clientHistory += 'Tarefas Relacionadas:\n';
      tasks.forEach((task: any) => {
        const status = task.concluida ? 'Concluída' : 'Pendente';
        clientHistory += `- ${task.titulo} (Status: ${status}, Vencimento: ${new Date(task.dataHora).toLocaleString('pt-BR')})\n`;
      });
    } else {
      clientHistory += 'Nenhuma tarefa registrada.\n';
    }

    const userMessage = `Por favor, analise o seguinte histórico e me forneça os próximos passos e mensagens.\n\n--- Histórico do Cliente ---\n${clientHistory}\n--- Fim do Histórico ---`;

    const result = await streamText({
      model: openrouter('deepseek/deepseek-chat'),
      system: riaSystemPrompt,
      prompt: userMessage,
      max_tokens: 1024,
      temperature: 0.7,
    });

    return result.toAIStreamResponse();

  } catch (error) {
    console.error('[RIA_SUGGESTION_ERROR]', error);
    return new Response('Erro ao obter sugestão da IA.', { status: 500 });
  }
}