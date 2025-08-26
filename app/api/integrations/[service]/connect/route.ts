// app/api/integrations/[service]/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

const getOAuthUrl = (service: string) => {
    // Em um cenário real, estas URLs e escopos viriam de variáveis de ambiente
    switch(service) {
        case 'slack':
            const slackClientId = process.env.SLACK_CLIENT_ID;
            const slackScopes = 'chat:write,users:read';
            return `https://slack.com/oauth/v2/authorize?client_id=${slackClientId}&scope=${slackScopes}&user_scope=`;
        case 'google':
            const googleClientId = process.env.GOOGLE_CLIENT_ID;
            const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`;
            const googleScopes = 'https://www.googleapis.com/auth/calendar.events';
            return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${googleScopes}&access_type=offline&prompt=consent`;
        default:
            return null;
    }
}

export async function GET(request: NextRequest, { params }: { params: { service: string } }) {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { service } = params;
    const oauthUrl = getOAuthUrl(service);

    if (oauthUrl) {
        return NextResponse.redirect(oauthUrl);
    }

    return NextResponse.json({ error: 'Serviço de integração não conhecido' }, { status: 400 });
}