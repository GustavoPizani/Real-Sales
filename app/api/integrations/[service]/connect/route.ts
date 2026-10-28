// app/api/integrations/[service]/connect/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { service: string } }
) {
  const { service } = params;

  let authUrl = '';

  switch (service) {
    case 'google':
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;
      const googleScopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.file' // <--- NOVO ESCOPO
      ].join(' ');
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${googleScopes}&access_type=offline&prompt=consent`;
      break;
    default:
      return NextResponse.json({ error: 'Serviço não suportado' }, { status: 400 });
  }

  return NextResponse.redirect(authUrl);
}

