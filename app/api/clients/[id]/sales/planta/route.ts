import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { acessoAoCliente } from '@/lib/client-sales';

export const dynamic = 'force-dynamic';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Planta de um imóvel vendido que não está cadastrado no CRM (imagem ou PDF). */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const a = await acessoAoCliente(params.id);
  if ('erro' in a) return a.erro;
  const form = await request.formData();
  const arquivo = form.get('file');
  if (!(arquivo instanceof File) || !arquivo.size) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  if (!TIPOS.includes(arquivo.type)) return NextResponse.json({ error: 'Envie a planta em JPG, PNG, WEBP ou PDF.' }, { status: 400 });
  if (arquivo.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo grande demais (máximo 10 MB).' }, { status: 400 });
  try {
    const nome = arquivo.name.replace(/[^\w.\-]+/g, '_').slice(-80);
    const blob = await put(`plantas/${params.id}/${Date.now()}-${nome}`, arquivo, { access: 'public' });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('[PLANTA_UPLOAD]', error);
    return NextResponse.json({ error: 'Não foi possível enviar a planta.' }, { status: 500 });
  }
}
