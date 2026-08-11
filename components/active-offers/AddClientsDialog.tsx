// components/active-offers/AddClientsDialog.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Role } from '@prisma/client';

interface User {
  id: string;
  name: string;
}

interface PropertyOption {
  id: string;
  title: string;
}

interface TargetOffer {
  id: string;
  source: 'INTERNAL_CLIENTS' | 'MAILING_UPLOAD';
}

interface AddClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: TargetOffer | null;
  onClientsAdded: () => void;
}

const ANY_PROPERTY = '__ANY__';
const NO_PROPERTY = 'NONE';
const ANY_BROKER = '__ANY__';

export default function AddClientsDialog({ open, onOpenChange, offer, onClientsAdded }: AddClientsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [source, setSource] = useState('meus_clientes');
  const [propertyOfInterestId, setPropertyOfInterestId] = useState(ANY_PROPERTY);
  const [brokerId, setBrokerId] = useState(ANY_BROKER);
  const [brokers, setBrokers] = useState<User[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOptions = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('authToken');
      const [usersRes, propertiesRes] = await Promise.all([
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/properties', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (usersRes.ok) setBrokers((await usersRes.json()).users || []);
      if (propertiesRes.ok) setProperties(await propertiesRes.json());
    } catch (error) {
      console.error("Failed to fetch dialog options", error);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      fetchOptions();
      setSource('meus_clientes');
      setPropertyOfInterestId(ANY_PROPERTY);
      setBrokerId(ANY_BROKER);
      setFile(null);
    }
  }, [open, fetchOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      let response: Response;

      if (offer.source === 'MAILING_UPLOAD') {
        if (!file) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um arquivo de planilha.' });
          setIsSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch(`/api/active-offers/${offer.id}/clients`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
      } else {
        response = await fetch(`/api/active-offers/${offer.id}/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            source,
            propertyOfInterestId: propertyOfInterestId === ANY_PROPERTY ? undefined : propertyOfInterestId,
            brokerId: brokerId === ANY_BROKER ? undefined : brokerId,
          }),
        });
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao adicionar clientes.');
      }

      toast({
        title: 'Sucesso!',
        description: `${result.addedCount} contato(s) adicionado(s)${result.alreadyLinkedCount ? ` (${result.alreadyLinkedCount} já estavam na campanha)` : ''}.`,
      });
      onClientsAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !offer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Mais Clientes</DialogTitle>
          <DialogDescription>
            {offer.source === 'MAILING_UPLOAD'
              ? 'Envie outra planilha pra somar contatos nessa campanha.'
              : 'Roda o filtro de novo e adiciona os clientes perdidos que ainda não estão nessa campanha.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {offer.source === 'MAILING_UPLOAD' ? (
            <div>
              <Label htmlFor="add-mailing-file">Planilha (.xlsx com colunas Nome, Email, Telefone)</Label>
              <Input
                id="add-mailing-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="source">Fonte de Clientes</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meus_clientes">Meus Clientes Descartados</SelectItem>
                    {user.role === Role.MARKETING_ADMIN && <SelectItem value="equipe">Clientes da Minha Equipe</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Imóvel de Interesse</Label>
                <Select value={propertyOfInterestId} onValueChange={setPropertyOfInterestId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_PROPERTY}>Qualquer imóvel</SelectItem>
                    <SelectItem value={NO_PROPERTY}>Sem imóvel definido</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {source === 'equipe' && (
                <div>
                  <Label>Corretor Específico (opcional)</Label>
                  <Select value={brokerId} onValueChange={setBrokerId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_BROKER}>Toda a equipe</SelectItem>
                      {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adicionando...' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
