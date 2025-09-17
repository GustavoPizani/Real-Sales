// app/api/upload/route.ts (caminho corrigido)

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth'; // ✅ Importa a função de autenticação
import { put } from '@vercel/blob'; // ✅ Importa a função 'put' do Vercel Blob
import { cookies } from 'next/headers'; // ✅ Importa a função de cookies

export async function POST(request: NextRequest) {
  try {
    const token = cookies().get('authToken')?.value; // ✅ Busca o token dos cookies
    const user = await getUserFromToken(token); // ✅ Valida o token
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // --- UPLOAD REAL PARA O VERCEL BLOB ---
    const blob = await put(file.name, file, {
      access: 'public', // Torna o arquivo publicamente acessível através do URL
      addRandomSuffix: true, // Adiciona um sufixo aleatório para evitar sobreposições de nome
    });

    // A função 'put' retorna um objeto com várias informações, incluindo o URL público do arquivo.
    return NextResponse.json({ success: true, url: blob.url });

  } catch (error) {
    console.error('Erro no upload para o Vercel Blob:', error);
    return NextResponse.json({ error: 'Erro interno do servidor durante o upload.' }, { status: 500 });
  }
}
