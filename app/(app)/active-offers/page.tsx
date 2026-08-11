// app/(app)/dashboard/active-offers/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Play, Users, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CreateOfferDialog from '@/components/active-offers/CreateOfferDialog';

interface ActiveOffer {
  id: string;
  name: string;
  status: string;
  source: 'INTERNAL_CLIENTS' | 'MAILING_UPLOAD';
  createdBy: {
    name: string;
  };
  _count: {
    clients: number;
  };
}

function OfferCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function ActiveOffersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'MARKETING_ADMIN';
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
      PENDING: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'destructive',
    };
    const labels: { [key: string]: string } = {
      PENDING: 'Pendente',
      IN_PROGRESS: 'Em andamento',
      COMPLETED: 'Concluída',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const getSourceLabel = (source: ActiveOffer['source']) =>
    source === 'MAILING_UPLOAD' ? 'Mailing Externo' : 'Clientes Internos';

  if (!user) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Oferta Ativa</h1>
          <p className="text-muted-foreground">Puxe contatos das campanhas para a sua base.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Nova Oferta
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <OfferCardSkeleton key={i} />)}
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">Nenhuma campanha encontrada</h3>
          <p className="text-muted-foreground mt-2">
            {isAdmin ? 'Crie sua primeira campanha de Oferta Ativa para começar.' : 'Nenhuma campanha disponível no momento.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardHeader>
                <CardTitle>{offer.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Criada por {offer.createdBy.name}
                  <Badge variant="outline">{getSourceLabel(offer.source)}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Pendentes na fila</span>
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
      {isAdmin && (
        <CreateOfferDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onOfferCreated={fetchOffers} />
      )}
    </div>
  );
}
