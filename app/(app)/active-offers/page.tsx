// app/(app)/dashboard/active-offers/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Users, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CreateOfferDialog from '@/components/active-offers/CreateOfferDialog';

interface ActiveOffer {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  createdBy: {
    nome: string;
  };
  _count: {
    clients: number;
  };
}

export default function ActiveOffersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [offers, setOffers] = useState<ActiveOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/active-offers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao buscar campanhas.');
      const data = await response.json();
      setOffers(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      Pendente: 'secondary',
      EmAndamento: 'default',
      Concluida: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Oferta Ativa</h1>
          <p className="text-muted-foreground">Crie e gerencie campanhas para reengajar clientes.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Nova Oferta
        </Button>
      </div>

      {loading ? (
        <p>Carregando campanhas...</p>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">Nenhuma campanha encontrada</h3>
          <p className="text-muted-foreground mt-2">Crie sua primeira campanha de Oferta Ativa para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardHeader>
                <CardTitle>{offer.name}</CardTitle>
                <CardDescription>Criada por {offer.createdBy.nome}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Clientes na lista</span>
                  <span className="font-semibold">{offer._count.clients}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Status</span>
                  {getStatusBadge(offer.status)}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => router.push(`/active-offers/${offer.id}/call`)}><Play className="h-4 w-4 mr-2" /> Iniciar Ligações</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <CreateOfferDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onOfferCreated={fetchOffers} />
    </div>
  );
}
