// components/active-offers/CreateOfferDialog.tsx
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

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferCreated: () => void;
}

const ANY_PROPERTY = '__ANY__';
const NO_PROPERTY = 'NONE';
const ANY_BROKER = '__ANY__';

export default function CreateOfferDialog({ open, onOpenChange, onOfferCreated }: CreateOfferDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [originType, setOriginType] = useState<'INTERNAL_CLIENTS' | 'MAILING_UPLOAD'>('INTERNAL_CLIENTS');
  const [name, setName] = useState('');
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
      setOriginType('INTERNAL_CLIENTS');
      setName('');
      setSource('meus_clientes');
      setPropertyOfInterestId(ANY_PROPERTY);
      setBrokerId(ANY_BROKER);
      setFile(null);
    }
  }, [open, fetchOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      let response: Response;

      if (originType === 'MAILING_UPLOAD') {
        if (!file) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um arquivo de planilha.' });
          setIsSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('name', name);
        formData.append('file', file);
        if (propertyOfInterestId !== ANY_PROPERTY && propertyOfInterestId !== NO_PROPERTY) {
          formData.append('propertyOfInterestId', propertyOfInterestId);
        }
        response = await fetch('/api/active-offers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
      } else {
        response = await fetch('/api/active-offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            name,
            source,
            propertyOfInterestId: propertyOfInterestId === ANY_PROPERTY ? undefined : propertyOfInterestId,
            brokerId: brokerId === ANY_BROKER ? undefined : brokerId,
          }),
        });
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao criar campanha.');
      }

      toast({ title: 'Sucesso!', description: 'Campanha de Oferta Ativa criada.' });
      onOfferCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Oferta Ativa</DialogTitle>
          <DialogDescription>Defina os parâmetros para a sua nova campanha de reengajamento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="name">Nome da Campanha</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label>Origem dos Contatos</Label>
            <Select value={originType} onValueChange={(v) => setOriginType(v as typeof originType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNAL_CLIENTS">Clientes Internos (perdidos no CRM)</SelectItem>
                <SelectItem value="MAILING_UPLOAD">Mailing Externo (upload de planilha)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {originType === 'INTERNAL_CLIENTS' ? (
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
          ) : (
            <>
              <div>
                <Label htmlFor="mailing-file">Planilha (.xlsx com colunas Nome, Email, Telefone)</Label>
                <Input
                  id="mailing-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div>
                <Label>Imóvel de Interesse (opcional)</Label>
                <Select value={propertyOfInterestId} onValueChange={setPropertyOfInterestId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_PROPERTY}>Nenhum (variado)</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Se essa lista for de um empreendimento específico, o imóvel já vem pré-selecionado na hora de classificar cada contato como interessado.
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Criando...' : 'Criar Campanha'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
