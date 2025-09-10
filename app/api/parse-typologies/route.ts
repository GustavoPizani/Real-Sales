// app/api/parse-typologies/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function buildParsePrompt(textContent: string): string {
    return `
      Você é um assistente especialista em converter texto não estruturado em dados JSON. Sua tarefa é analisar o texto abaixo, que foi copiado de uma tabela de tipologias de um site de imóveis, e extrair todas as unidades.

      **Instruções de Extração:**
      1.  Cada linha do texto representa uma tipologia diferente.
      2.  Para cada linha, identifique e extraia os seguintes dados:
          - **valor**: O preço. Extraia apenas os dígitos. Se não houver preço, use null.
          - **area**: A área em metros quadrados.
          - **dormitorios**: O número de quartos.
          - **suites**: O número de suítes.
          - **vagas**: O número de vagas de garagem.
          - **nome**: Crie um nome descritivo usando a área, como "Apartamento de [area]m²".

      **Exemplo de Texto de Entrada:**
      "R$ 1.561.859 70,5 2 1 1
       R$ 1.687.232 76,5 2 2 1
       R$ 1.668.725 84,5 3 1 1"

      **Estrutura do JSON de Saída (Obrigatório):**
      Retorne APENAS o objeto JSON.
      {
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
            console.error("Resposta da IA não continha um JSON válido:", responseText);
            throw new Error("A IA não conseguiu analisar o texto fornecido.");
        }
        
        const jsonString = jsonMatch[1] || jsonMatch[2];
        const parsedData = JSON.parse(jsonString);

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error('ERRO ao analisar o texto com a IA:', error);
        return NextResponse.json({ error: "A API de IA não conseguiu processar o texto.", details: error.message }, { status: 500 });
    }
}