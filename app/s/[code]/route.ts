import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const shortLink = await prisma.shortLink.findUnique({ where: { code: params.code } });

  if (!shortLink) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.redirect(shortLink.targetUrl);
}
