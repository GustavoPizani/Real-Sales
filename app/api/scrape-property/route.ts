// app/api/scrape-property/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Inicializa o cliente, apontando para a API do OpenRouter
const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL,
        "X-Title": process.env.NEXT_PUBLIC_SITE_NAME,
    },
});

/**
 * Constrói o prompt detalhado para a API de IA.
 * @param htmlContent O conteúdo HTML bruto da página do imóvel.
 * @returns A string do prompt completa.
 */
function buildPrompt(htmlContent: string): string {
    return `
Você é um assistente de extração de dados altamente preciso, especializado no mercado imobiliário. Analise o seguinte código HTML e extraia as informações estritamente conforme as regras abaixo, retornando um objeto JSON.

**Regras de Extração:**
1.  **title**: Encontre o título principal do empreendimento no \`<h2>\` dentro do \`div.building-title-container\`.
2.  **address**: Encontre o endereço completo no \`div#building_address\`.
3.  **description**: Encontre o parágrafo de descrição longa do imóvel.
4.  **images**: Encontre todas as tags \`<img>\` dentro do \`div#orulo_carousel\` e extraia os valores do atributo \`src\`.
5.  **typologies**: A informação mais importante está numa \`<table>\` dentro de uma \`<section>\` com o ID \`info_typologies-section\`. Você DEVE encontrar esta tabela. Dentro do \`<tbody>\` da tabela, cada \`<tr>\` é uma tipologia. Para cada \`<tr>\`, extraia os dados das células \`<td>\` na seguinte ordem exacta:
    - **valor**: O preço está na PRIMEIRA (\`<td>\`). Limpe o texto para extrair apenas o valor numérico.
    - **area**: A área está na SEGUNDA (\`<td>\`). Extraia apenas o valor numérico.
    - **dormitorios**: O número de quartos está na TERCEIRA (\`<td>\`).
    - Para **suites**, **banheiros** e **vagas**, encontre os valores na secção de características gerais (geralmente num \`fieldset#highlighted_section\`) e adicione-os a cada objecto de tipologia que você criar.
    - **nome**: Crie um nome descritivo, como "Unidade de [área]m²", usando a área extraída.
**Estrutura do JSON de Saída Desejado (use estes nomes de campos em português):**
{
  "title": "string",
  "address": "string",
  "description": "string",
  "images": ["url1", "url2", ...],
  "typologies": [
    {
      "nome": "string",
      "valor": "number",
      "area": "number",
      "dormitorios": "string | number",
      "suites": "string | number",
      "banheiros": "string | number",
      "vagas": "string | number"
    }
  ]
}

**Código HTML para Análise:**
${htmlContent}
    `;
}

export async function POST(req: Request) {
    console.log('[SCAN] Pedido recebido na API /api/scrape-property');
    if (!process.env.OPENROUTER_API_KEY) {
        console.error('[SCAN] ERRO: A chave da API do OpenRouter não está configurada.');
        return NextResponse.json({ error: 'A chave da API do OpenRouter não está configurada no ambiente.' }, { status: 500 });
    }

    try {
        const { url } = await req.json();
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL é obrigatória.' }, { status: 400 });
        }
        console.log(`[SCAN] A iniciar scraping para o URL: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            },
        });

        if (!response.ok) {
            console.error(`[SCAN] Falha ao aceder ao URL. Status: ${response.status}`);
            return NextResponse.json({ error: `Não foi possível aceder ao URL. Status: ${response.status}` }, { status: response.status });
        }

        const htmlContent = await response.text();
        console.log('[SCAN] HTML da página obtido com sucesso.');

        const prompt = buildPrompt(htmlContent);
        console.log('[SCAN] Prompt enviado para a IA (primeiros 300 caracteres):', prompt.substring(0, 300) + '...');

        const completion = await openrouter.chat.completions.create({
            model: "google/gemini-flash-1.5",
            messages: [{ "role": "user", "content": prompt }],
            response_format: { type: "json_object" },
        });

        const aiResponseContent = completion.choices[0]?.message?.content;

        if (!aiResponseContent) {
            console.error('[SCAN] ERRO: A API de IA retornou uma resposta vazia.');
            throw new Error("A API de IA retornou uma resposta vazia.");
        }

        console.log('[SCAN] Resposta recebida da IA (bruta):', aiResponseContent);

        try {
            const scrapedData = JSON.parse(aiResponseContent);
            console.log('[SCAN] JSON da IA analisado com sucesso:', scrapedData);
            return NextResponse.json(scrapedData);
        } catch (parseError) {
            console.error('[SCAN] ERRO: Não foi possível analisar o JSON retornado pela IA.', parseError);
            throw new Error("A API de IA não retornou um JSON válido.");
        }

    } catch (error: any) {
        console.error('[SCAN] ERRO no processo geral de scraping:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Falha ao processar o scraping com IA.';
        return NextResponse.json({ error: "A API de IA não conseguiu processar a página.", details: errorMessage }, { status: 500 });
    }
}