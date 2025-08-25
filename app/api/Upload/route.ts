// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { put } from '@vercel/blob'; // Importa a função 'put' do Vercel Blob

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 });
    }

    // --- UPLOAD REAL PARA O VERCEL BLOB ---
    // A função 'put' trata de todo o processo de upload.
    // O primeiro argumento é o nome do ficheiro, o segundo é o conteúdo,
    // e o terceiro são as opções, como o nível de acesso.
    const blob = await put(file.name, file, {
      access: 'public', // Torna o ficheiro publicamente acessível através do URL
    });

    // A função 'put' devolve um objeto com várias informações, incluindo o URL público do ficheiro.
    return NextResponse.json({ success: true, url: blob.url });

  } catch (error) {
    console.error('Erro no upload para o Vercel Blob:', error);
    return NextResponse.json({ error: 'Erro interno do servidor durante o upload.' }, { status: 500 });
  }
}
