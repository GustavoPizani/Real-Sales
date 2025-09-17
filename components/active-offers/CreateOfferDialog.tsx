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
  nome: string;
}

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferCreated: () => void;
}

export default function CreateOfferDialog({ open, onOpenChange, onOfferCreated }: CreateOfferDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [source, setSource] = useState('meus_clientes');
  const [brokers, setBrokers] = useState<User[]>([]);
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBrokers = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        // Filtra para mostrar apenas corretores, ou a equipe do gerente
        let userList = data.users || [];
        if (user.role === Role.gerente) {
            userList = userList.filter((u: any) => u.superiorId === user.id || u.id === user.id);
        }
        setBrokers(userList);
      }
    } catch (error) {
      console.error("Failed to fetch brokers", error);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      fetchBrokers();
      // Reseta o formulário ao abrir
      setName('');
      setSource('meus_clientes');
      setAssignedToIds(user ? [user.id] : []);
    }
  }, [open, fetchBrokers, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/active-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, source, assignedToIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao criar campanha.');
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
            <Label htmlFor="source">Fonte de Clientes</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meus_clientes">Meus Clientes Descartados</SelectItem>
                {(user.role === Role.gerente || user.role === Role.diretor || user.role === Role.marketing_adm) && <SelectItem value="equipe">Clientes da Minha Equipe</SelectItem>}
                {(user.role === Role.gerente || user.role === Role.diretor || user.role === Role.marketing_adm) && <SelectItem value="sem_corretor">Clientes Sem Corretor</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="assignedTo">Atribuir Para</Label>
            <Select onValueChange={(value) => setAssignedToIds([value])} defaultValue={user.id}>
              <SelectTrigger><SelectValue placeholder="Selecione um ou mais corretores..." /></SelectTrigger>
              <SelectContent>{brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Criando...' : 'Criar Campanha'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

