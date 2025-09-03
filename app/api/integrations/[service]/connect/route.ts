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
// =================================================================
      // INÍCIO DO BLOCO DE DEBUG ("SCAN")
      // =================================================================
      console.log('--- DEBUG GOOGLE CONNECT ---');
      console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
      console.log('CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);
      console.log('REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
      console.log('----------------------------');
      // =================================================================
      // FIM DO BLOCO DE DEBUG
      // =================================================================

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

