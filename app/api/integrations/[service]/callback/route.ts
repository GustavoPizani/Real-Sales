// app/api/integrations/[service]/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

// Esta é uma implementação simplificada. A lógica real seria mais complexa.
async function handleOAuthCallback(service: string, code: string, userId: string) {
    // Lógica para trocar o código por um token de acesso
    // Ex: para o Slack, faria uma chamada para https://slack.com/api/oauth.v2.access
    // Ex: para o Google, faria uma chamada para https://oauth2.googleapis.com/token
    
    const accessToken = `fake_access_token_for_${service}`;
    const refreshToken = `fake_refresh_token_for_${service}`;

    const integration = await prisma.integration.findUnique({ where: { name: service } });
    if (!integration) return false;

    await prisma.userIntegration.upsert({
        where: { userId_integrationId: { userId, integrationId: integration.id } },
        update: { accessToken, refreshToken },
        create: { userId, integrationId: integration.id, accessToken, refreshToken },
    });

    return true;
}

export async function GET(request: NextRequest, { params }: { params: { service: string } }) {
    const user = await getUserFromToken(request);
    if (!user) {
      // O callback pode não ter o token na sessão, a verificação de estado (state) é crucial
      // Para este exemplo, vamos assumir que o usuário está logado
      return NextResponse.redirect(new URL('/integrations?error=auth', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const { service } = params;

    if (!code) {
        return NextResponse.redirect(new URL('/integrations?error=no_code', request.url));
    }

    const success = await handleOAuthCallback(service, code, user.id);

    if (success) {
        return NextResponse.redirect(new URL('/integrations?success=true', request.url));
    }
    
    return NextResponse.redirect(new URL('/integrations?error=failed', request.url));
}