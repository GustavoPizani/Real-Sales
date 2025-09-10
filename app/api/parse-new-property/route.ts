// app/api/parse-new-property/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function buildParsePrompt(textContent: string): string {
    return `
      Você é um assistente especialista em extrair dados de blocos de texto sobre imóveis. Sua tarefa é analisar o texto abaixo e convertê-lo em um objeto JSON estruturado.

      **Regras de Extração:**
      1.  **title**: A primeira linha do texto, contendo o nome do empreendimento.
      2.  **address**: A segunda linha do texto, contendo o endereço.
      3.  **features**: Encontre a lista de itens sob o título "Características condominiais". Extraia cada item e retorne como um array de strings. Se a seção não existir, retorne um array vazio [].
      4.  **typologies**: Encontre a seção "Tipologias disponíveis". Para cada tipologia (ex: "Garden", "Apartamento"), extraia seu nome e os dados da tabela: valor (apenas números), área (m²), dormitórios, suítes e vagas.

      **Estrutura do JSON de Saída (Obrigatório):**
      Retorne APENAS o objeto JSON, sem nenhum texto ou formatação adicional. O campo "description" NÃO deve ser incluído.
      {
        "title": "string",
        "address": "string",
        "features": ["item1", "item2", ...],
        "typologies": [
          {
            "nome": "string",
            "valor": "number | null",
            "area": "number | null",
            "dormitorios": "number | null",
            "suites": "number | null",
            "vagas": "number | null"
          }
        ]
      }

      **Texto para Análise:**
      ${textContent}
    `;
}

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return NextResponse.json({ error: 'O texto é obrigatório.' }, { status: 400 });
        }

        const prompt = buildParsePrompt(text);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
        if (!jsonMatch || (!jsonMatch[1] && !jsonMatch[2])) {
            throw new Error("A IA não conseguiu estruturar os dados do texto fornecido.");
        }
        
        const jsonString = jsonMatch[1] || jsonMatch[2];
        const parsedData = JSON.parse(jsonString);

        // Garante que o campo description não seja enviado, mesmo que a IA o adicione por engano
        if (parsedData.description) {
            delete parsedData.description;
        }

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error('ERRO ao analisar o texto do imóvel com a IA:', error);
        return NextResponse.json({ error: "A API de IA não conseguiu processar o texto.", details: error.message }, { status: 500 });
    }
}