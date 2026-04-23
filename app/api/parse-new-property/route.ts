// app/api/parse-new-property/route.ts

import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const SYSTEM_PROMPT = `Você é um assistente especialista em extrair dados de blocos de texto sobre imóveis.
Retorne APENAS um objeto JSON válido, sem markdown, sem explicações, sem \`\`\`.

Estrutura obrigatória:
{
  "title": "nome do empreendimento",
  "address": "endereço completo",
  "features": ["característica 1", "característica 2"],
  "typologies": [
    {
      "name": "nome da tipologia",
      "valor": número_ou_null,
      "area": número_ou_null,
      "dormitorios": número_ou_null,
      "suites": número_ou_null,
      "vagas": número_ou_null
    }
  ]
}

Regras:
- Retorne SOMENTE o JSON puro, sem nada antes ou depois
- Campos numéricos ausentes: use null
- "features": itens listados como características/diferenciais do condomínio
- "typologies": tipos de unidade (Garden, Apartamento, Studio, etc.)
- "valor": apenas o número sem R$ ou pontos de milhar`;

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return NextResponse.json({ error: 'O texto é obrigatório.' }, { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'GROQ_API_KEY não configurada. Obtenha uma chave gratuita em console.groq.com' },
                { status: 500 }
            );
        }

        const groq = new Groq({ apiKey });

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: text },
            ],
            temperature: 0.1,
            max_tokens: 2048,
            response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0]?.message?.content ?? '';
        const parsedData = JSON.parse(responseText);
        delete parsedData.description;

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error('ERRO ao analisar o texto do imóvel:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'A IA retornou um formato inválido. Tente novamente.' },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { error: 'Erro ao processar o texto.', details: error.message },
            { status: 500 }
        );
    }
}
