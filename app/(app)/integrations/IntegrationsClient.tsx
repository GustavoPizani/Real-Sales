'use client';

import { useState } from 'react';

interface IntegrationStatus {
  google: boolean;
}

interface IntegrationsClientProps {
  initialStatus: IntegrationStatus;
}

export default function IntegrationsClient({ initialStatus }: IntegrationsClientProps) {
  const [status, setStatus] = useState<IntegrationStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleConnect = () => {
    setIsLoading(true);
    // Redireciona o usuário para a rota de autenticação do Google no backend
    window.location.href = '/api/integrations/google/auth';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Integrações</h1>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Google Drive</h2>
            <p className="text-sm text-gray-500">
              Conecte seu Google Drive para fazer upload e gerenciar arquivos.
            </p>
          </div>
          <button
            onClick={handleGoogleConnect}
            disabled={status.google || isLoading}
            className={`px-4 py-2 rounded text-white font-semibold ${
              status.google ? 'bg-green-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Conectando...' : status.google ? 'Conectado' : 'Conectar'}
          </button>
        </div>
      </div>
    </div>
  );
}

