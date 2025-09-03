// app/(app)/integrations/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import IntegrationsClient from './IntegrationsClient';

async function getIntegrationStatus() {
  try {
    const googleIntegration = await prisma.integration.findUnique({
      where: { name: 'google_drive' },
      select: { isEnabled: true, refreshToken: true },
    });

    return {
      google: !!(googleIntegration?.isEnabled && googleIntegration.refreshToken),
    };
  } catch (error) {
    console.error('Erro ao buscar status de integração:', error);
    return { google: false };
  }
}

export default async function IntegrationsPage() {
  const token = cookies().get('auth_token')?.value;
  const user = await getUserFromToken(token);

  if (!user) {
    redirect('/login');
  }

  const integrationStatus = await getIntegrationStatus();

  return <IntegrationsClient initialStatus={integrationStatus} />;
}

