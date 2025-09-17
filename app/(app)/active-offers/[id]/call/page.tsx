// app/(app)/dashboard/active-offers/[id]/call/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Phone, PhoneOff, UserCheck, Loader2, Mail, MessageSquare, Trash2 } from 'lucide-react';
import { ActiveOfferClientStatus } from '@prisma/client';

interface ClientNote {
  content: string;
  createdAt: string;
}

interface ActiveOfferClient {
  id: string;
  status: string;
  cliente: {
    nomeCompleto: string;
    telefone: string | null;
    email: string | null;
    notas: ClientNote[];
  };
}

export default function ActiveOfferCallPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const offerId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [clients, setClients] = useState<ActiveOfferClient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callNotes, setCallNotes] = useState('');

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
      const pendingClients = data.clients.filter((c: ActiveOfferClient) => c.status === 'Pendente');
      setClients(pendingClients);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [offerId, toast]);

  useEffect(() => {
    fetchOfferClients();
  }, [fetchOfferClients]);

  const currentClient = clients[currentIndex];

  const handleNextClient = () => {
    if (currentIndex < clients.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCallNotes('');
    } else {
      toast({ title: 'Fim da Lista!', description: 'Você contatou todos os clientes desta campanha.' });
      router.push('/active-offers');
    }
  };

  const handleSubmitResult = async (status: ActiveOfferClientStatus) => {
    if (!currentClient) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/active-offer-clients/${currentClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status, notes: callNotes }),
      });
      if (!response.ok) throw new Error('Falha ao registrar resultado.');
      toast({ title: 'Sucesso', description: 'Resultado da ligação registrado.' });
      handleNextClient();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFromOffer = async () => {
    if (!window.confirm("Tem certeza que deseja remover este cliente da campanha de oferta ativa?")) return;
    await handleSubmitResult(ActiveOfferClientStatus.Descartado);
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!currentClient) {
    return (
      <div className="flex h-screen items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold">Campanha Concluída!</h2>
          <p className="text-muted-foreground mt-2">Não há mais clientes pendentes nesta lista.</p>
          <Button onClick={() => router.push('/active-offers')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Campanhas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4 sm:p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Ligação - Oferta Ativa</h1>
        <span className="font-mono text-lg">{currentIndex + 1} / {clients.length}</span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl">{currentClient.cliente.nomeCompleto}</CardTitle>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2">
                    <span>Telefone: {currentClient.cliente.telefone || 'N/A'}</span>
                    <span>Email: {currentClient.cliente.email || 'N/A'}</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-6">
                    <Button asChild variant="outline" className="flex-1" disabled={!currentClient.cliente.telefone}>
                        <a href={`tel:${currentClient.cliente.telefone}`}><Phone className="mr-2 h-4 w-4" /> Ligar</a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1" disabled={!currentClient.cliente.telefone}>
                        <a href={`https://wa.me/55${currentClient.cliente.telefone?.replace(/\D/g, '')}`} target="_blank"><MessageSquare className="mr-2 h-4 w-4" /> WhatsApp</a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1" disabled={!currentClient.cliente.email}>
                        <a href={`mailto:${currentClient.cliente.email}`}><Mail className="mr-2 h-4 w-4" /> E-mail</a>
                    </Button>
                </div>

                <h4 className="font-semibold mb-2">Últimas Anotações:</h4>
                <div className="space-y-3 text-sm text-muted-foreground max-h-48 overflow-y-auto pr-2">
                {currentClient.cliente.notas.length > 0 ? currentClient.cliente.notas.map(note => (
                    <p key={note.createdAt} className="border-l-2 pl-2">"{note.content}"</p>
                )) : <p>Nenhuma anotação anterior.</p>}
                </div>
            </CardContent>
        </Card>

        <div className="flex flex-col space-y-4">
          <Textarea placeholder="Adicione uma anotação sobre a ligação..." value={callNotes} onChange={(e) => setCallNotes(e.target.value)} className="flex-1 text-base" />
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 h-14 text-lg" onClick={() => handleSubmitResult(ActiveOfferClientStatus.Contactado)} disabled={isSubmitting}><Phone className="mr-2 h-5 w-5" /> Atendeu</Button>
              <Button size="lg" variant="destructive" className="h-14 text-lg" onClick={() => handleSubmitResult(ActiveOfferClientStatus.NaoAtendeu)} disabled={isSubmitting}><PhoneOff className="mr-2 h-5 w-5" /> Não Atendeu</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button size="lg" variant="secondary" onClick={handleNextClient} disabled={isSubmitting}><UserCheck className="mr-2 h-5 w-5" /> Pular</Button>
              <Button size="lg" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleRemoveFromOffer} disabled={isSubmitting}>
                <Trash2 className="mr-2 h-5 w-5" /> Remover da Oferta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
