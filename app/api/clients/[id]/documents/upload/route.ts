import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  // Armazenamento de documentos é exclusivo do administrador.
  if (user.role !== Role.MARKETING_ADMIN) {
    return NextResponse.json({ error: 'Acesso restrito ao administrador' }, { status: 403 });
  }

  const clientId = params.id;
  const form = await request.formData();
  const file = form.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  try {
    // Faz o upload do arquivo para o Vercel Blob
    const blob = await put(
      `documents/${clientId}/${file.name}`, // Define um caminho organizado para o arquivo
      file,
      { access: 'public' }
    );

    // Salva a referência do arquivo no banco de dados
    const document = await prisma.clientDocument.create({
      data: {
        name: file.name,
        url: blob.url,
        clientId,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Erro ao fazer upload do arquivo:", error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao fazer upload do arquivo.' },
      { status: 500 }
    );
  }
}

