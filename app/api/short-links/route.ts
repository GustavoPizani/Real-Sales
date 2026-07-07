import { randomBytes } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

function generateCode() {
  return randomBytes(5).toString('base64url').slice(0, 7);
}

// POST: Creates (or reuses) a short link for a given target URL
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { targetUrl } = await request.json();
    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json({ error: 'URL de destino é obrigatória.' }, { status: 400 });
    }

    const existing = await prisma.shortLink.findFirst({ where: { targetUrl } });
    const shortLink = existing ?? await prisma.shortLink.create({
      data: { code: generateCode(), targetUrl },
    });

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
    return NextResponse.json({ code: shortLink.code, url: `${origin}/s/${shortLink.code}` });
  } catch (error) {
    console.error('Erro ao gerar link curto:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar o link.' }, { status: 500 });
  }
}
