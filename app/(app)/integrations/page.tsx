import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { service: string } }
) {
  const { service } = params;

  let authUrl = '';

  switch (service) {
    // Remova o case 'google' daqui. Deixe apenas os outros, se houver.
    default:
      return NextResponse.json({ error: 'Serviço não suportado' }, { status: 400 });
  }

  return NextResponse.redirect(authUrl);
}