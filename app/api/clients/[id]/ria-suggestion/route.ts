import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';

// Groq é compatível com o formato OpenAI — só muda a baseURL
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

const noteSchema = z.object({
  content: z.string(),
  authorId: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

const taskSchema = z.object({
  title: z.string(),
  isCompleted: z.boolean().optional(),
  dateTime: z.string().optional(),
}).passthrough();

const riaSystemPrompt = `Atue como 'RIA - Real-Sales Inteligência Artificial', uma assistente de CRM especialista em comunicação com clientes do mercado imobiliário. Seu único objetivo é analisar o histórico de um cliente e sugerir os próximos passos para o BROKER.
Siga sempre esta estrutura de resposta:
1. **[Análise Rápida]**
   * Um parágrafo curto resumindo o status atual do cliente.
2. **[Sugestões de Próximos Passos]**
   * **Opção 1:** [Nome da Ação] - **Porquê:** [Justificativa].
   * **Opção 2:** [Nome da Ação] - **Porquê:** [Justificativa].
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
   * ... e assim por diante.
Responda APENAS com a estrutura solicitada, começando por '[Análise Rápida]'.`;

export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return new Response('Não autorizado', { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return new Response('GROQ_API_KEY não configurada.', { status: 500 });
    }

    const bodySchema = z.object({
      clientName: z.string(),
      notes: z.array(noteSchema).optional(),
      tasks: z.array(taskSchema).optional(),
    });

    const { notes, tasks, clientName } = bodySchema.parse(await request.json());

    let clientHistory = `Histórico do Cliente: ${clientName}\n\nAnotações Recentes:\n`;
    if (notes && notes.length > 0) {
      notes.forEach(note => {
        const data = note.createdAt ? new Date(note.createdAt).toLocaleDateString('pt-BR') : 'data desconhecida';
        clientHistory += `- "${note.content}" (em ${data})\n`;
      });
    } else {
      clientHistory += '- Nenhuma anotação registrada.\n';
    }

    clientHistory += '\nTarefas Relacionadas:\n';
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        const status = task.isCompleted ? 'Concluída' : 'Pendente';
        const vencimento = task.dateTime ? new Date(task.dateTime).toLocaleString('pt-BR') : 'sem data';
        clientHistory += `- ${task.title} (Status: ${status}, Vencimento: ${vencimento})\n`;
      });
    } else {
      clientHistory += '- Nenhuma tarefa registrada.\n';
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: riaSystemPrompt },
        { role: 'user', content: clientHistory },
      ],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('[RIA_SUGGESTION_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ message: 'Dados de entrada inválidos.', issues: error.issues }),
        { status: 400 }
      );
    }
    return new Response('Erro ao obter sugestão da IA.', { status: 500 });
  }
}
