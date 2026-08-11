// app/(app)/dashboard/active-offers/[id]/call/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import ClassificationCard, { ClassificationCardSkeleton } from '@/components/call-queue/ClassificationCard';
import type { Outcome } from '@/lib/call-queue';

interface ActiveOfferClient {
  id: string;
  status: string;
  fullName: string;
  phone: string | null;
  email: string | null;
}

interface PropertyOption {
  id: string;
  title: string;
}

export default function ActiveOfferCallPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const offerId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [clients, setClients] = useState<ActiveOfferClient[]>([]);
  const [defaultPropertyId, setDefaultPropertyId] = useState<string | undefined>(undefined);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOfferClients = useCallback(async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/active-offers/${offerId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao carregar campanha.');
      const data = await response.json();
      setClients(data.clients);
      setDefaultPropertyId(data.defaultPropertyOfInterestId || undefined);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [offerId, toast]);

  const fetchProperties = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/properties', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setProperties(await response.json());
    } catch {
      // seleção de imóvel fica vazia, não impede o resto do fluxo
    }
  }, []);

  useEffect(() => {
    fetchOfferClients();
    fetchProperties();
  }, [fetchOfferClients, fetchProperties]);

  const currentClient = clients[0];

  const handleClassify = async (
    payload: { outcome: Outcome; comment?: string; propertyOfInterestId?: string },
    exitQueue: boolean,
  ) => {
    if (!currentClient) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/active-offer-clients/${currentClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao registrar resultado.');

      toast({ title: 'Salvo!', description: 'Classificação registrada.' });

      if (exitQueue) {
        router.push('/active-offers');
      } else {
        await fetchOfferClients();
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background p-4 sm:p-8">
      <header className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/active-offers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Ligação - Oferta Ativa</h1>
      </header>

      {loading ? (
        <ClassificationCardSkeleton />
      ) : !currentClient ? (
        <div className="flex flex-1 items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-bold">Campanha Concluída!</h2>
            <p className="text-muted-foreground mt-2">Não há mais clientes pendentes nesta lista.</p>
            <Button onClick={() => router.push('/active-offers')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Campanhas
            </Button>
          </div>
        </div>
      ) : (
        <ClassificationCard
          contact={currentClient}
          properties={properties}
          defaultPropertyId={defaultPropertyId}
          submitting={isSubmitting}
          onSubmit={handleClassify}
        />
      )}
    </div>
  );
}
