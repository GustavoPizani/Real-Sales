import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Inicializa o cliente do Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

const riaSystemPrompt = `Atue como 'RIA - Real-Sales Inteligência Artificial', uma assistente de CRM especialista em comunicação com clientes do mercado imobiliário. Seu único objetivo é analisar o histórico de um cliente e sugerir os próximos passos para o corretor.
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
    const token = cookies().get('authToken')?.value;
    const user = await getUserFromToken(token);
    if (!user) {
      return new Response('Não autorizado', { status: 401 });
    }

    const bodySchema = z.object({
      clientName: z.string(),
      notes: z.array(noteSchema).optional(),
      tasks: z.array(taskSchema).optional(),
    });

    const { notes, tasks, clientName } = bodySchema.parse(await request.json());

    let clientHistory = `Histórico do Cliente: ${clientName}\n\nAnotações Recentes:\n`;
    notes?.forEach(note => {
      clientHistory += `- "${note.content}" (Feita por ${note.createdBy} em ${new Date(note.createdAt).toLocaleDateString('pt-BR')})\n`;
    });

    clientHistory += '\nTarefas Relacionadas:\n';
    tasks?.forEach(task => {
      const status = task.concluida ? 'Concluída' : 'Pendente';
      clientHistory += `- ${task.titulo} (Status: ${status}, Vencimento: ${new Date(task.dataHora).toLocaleString('pt-BR')})\n`;
    });

    const fullPrompt = `${riaSystemPrompt}\n\n${clientHistory}`;

    const geminiStream = await genAI
        .getGenerativeModel({ model: 'gemini-1.5-flash' })
        .generateContentStream(fullPrompt);

    const stream = GoogleGenerativeAIStream(geminiStream);
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('[RIA_SUGGESTION_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ message: 'Dados de entrada inválidos.', issues: error.issues }), { status: 400 });
    }
    return new Response('Erro ao obter sugestão da IA.', { status: 500 });
  }
}