// app/(app)/dashboard/active-offers/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Play, Users, Clock, MoreVertical, UserPlus, Pause, PlayCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CreateOfferDialog from '@/components/active-offers/CreateOfferDialog';
import AddClientsDialog from '@/components/active-offers/AddClientsDialog';

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
  const [addClientsOffer, setAddClientsOffer] = useState<ActiveOffer | null>(null);
  const [deleteOfferId, setDeleteOfferId] = useState<string | null>(null);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);

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
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      PENDING: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'destructive',
      PAUSED: 'outline',
    };
    const labels: { [key: string]: string } = {
      PENDING: 'Pendente',
      IN_PROGRESS: 'Em andamento',
      COMPLETED: 'Concluída',
      PAUSED: 'Pausada',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const getSourceLabel = (source: ActiveOffer['source']) =>
    source === 'MAILING_UPLOAD' ? 'Mailing Externo' : 'Clientes Internos';

  const togglePause = async (offer: ActiveOffer) => {
    setBusyOfferId(offer.id);
    try {
      const token = localStorage.getItem('authToken');
      const nextStatus = offer.status === 'PAUSED' ? 'PENDING' : 'PAUSED';
      const response = await fetch(`/api/active-offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Falha ao atualizar campanha.');
      toast({ title: nextStatus === 'PAUSED' ? 'Campanha pausada.' : 'Campanha reativada.' });
      fetchOffers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteOfferId) return;
    setBusyOfferId(deleteOfferId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/active-offers/${deleteOfferId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Falha ao excluir campanha.');
      toast({ title: 'Campanha excluída.' });
      setDeleteOfferId(null);
      fetchOffers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setBusyOfferId(null);
    }
  };

  if (!user) return null;

  const activeOffers = offers.filter(o => o.status !== 'PAUSED');
  const pausedOffers = offers.filter(o => o.status === 'PAUSED');

  const renderOfferGrid = (list: ActiveOffer[], emptyMessage: string) => (
    loading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {[...Array(3)].map((_, i) => <OfferCardSkeleton key={i} />)}
      </div>
    ) : list.length === 0 ? (
      <div className="text-center py-12 border-2 border-dashed rounded-lg mt-4">
        <h3 className="text-xl font-semibold">Nenhuma campanha encontrada</h3>
        <p className="text-muted-foreground mt-2">{emptyMessage}</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {list.map((offer) => (
          <Card key={offer.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{offer.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1.5">
                  Criada por {offer.createdBy.name}
                  <Badge variant="outline">{getSourceLabel(offer.source)}</Badge>
                </CardDescription>
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={busyOfferId === offer.id}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setAddClientsOffer(offer)}>
                      <UserPlus className="h-4 w-4 mr-2" /> Adicionar clientes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePause(offer)}>
                      {offer.status === 'PAUSED' ? (
                        <><PlayCircle className="h-4 w-4 mr-2" /> Reativar</>
                      ) : (
                        <><Pause className="h-4 w-4 mr-2" /> Pausar</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOfferId(offer.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
              <Button
                className="w-full"
                disabled={offer.status === 'PAUSED'}
                onClick={() => router.push(`/active-offers/${offer.id}/call`)}
              >
                <Play className="h-4 w-4 mr-2" /> Iniciar Ligações
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  );

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

      {isAdmin ? (
        <Tabs defaultValue="ativas">
          <TabsList>
            <TabsTrigger value="ativas">Ativas</TabsTrigger>
            <TabsTrigger value="pausadas">Pausadas</TabsTrigger>
          </TabsList>
          <TabsContent value="ativas">
            {renderOfferGrid(activeOffers, isAdmin ? 'Crie sua primeira campanha de Oferta Ativa para começar.' : 'Nenhuma campanha disponível no momento.')}
          </TabsContent>
          <TabsContent value="pausadas">
            {renderOfferGrid(pausedOffers, 'Nenhuma campanha pausada.')}
          </TabsContent>
        </Tabs>
      ) : (
        renderOfferGrid(activeOffers, 'Nenhuma campanha disponível no momento.')
      )}

      {isAdmin && (
        <>
          <CreateOfferDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onOfferCreated={fetchOffers} />
          <AddClientsDialog
            open={!!addClientsOffer}
            onOpenChange={(open) => !open && setAddClientsOffer(null)}
            offer={addClientsOffer}
            onClientsAdded={fetchOffers}
          />
          <AlertDialog open={!!deleteOfferId} onOpenChange={(open) => !open && setDeleteOfferId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso remove a campanha e a fila de contatos dela. Os clientes em si não são excluídos, só o vínculo com essa campanha. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
