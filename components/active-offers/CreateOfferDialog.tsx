// components/active-offers/CreateOfferDialog.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileText, Users as UsersIcon } from 'lucide-react';
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
  
  // Estado geral
  const [creationType, setCreationType] = useState<'system' | 'list'>('system');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para criação a partir do sistema
  const [name, setName] = useState('');
  const [source, setSource] = useState('meus_clientes');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);

  // Estado para criação a partir de lista
  const [listName, setListName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [listAssignedToIds, setListAssignedToIds] = useState<string[]>([]);

  // Estado para a lista de corretores
  const [allBrokers, setAllBrokers] = useState<User[]>([]);

  const fetchBrokers = useCallback(async () => {
    if (!user) return;
    try {
      // A autenticação é via cookie, não precisa mais do token no header
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Filtra para mostrar apenas corretores
        const brokersList = (data.users || []).filter((u: any) => u.role === Role.corretor);
        setAllBrokers(brokersList);
      }
    } catch (error) {
      console.error("Failed to fetch brokers", error);
    }
  }, [user]); 

  useEffect(() => {
    if (open) {
      fetchBrokers();
      // Reseta o formulário ao abrir
      setIsSubmitting(false);
      setCreationType('system');
      setName('');
      setSource('meus_clientes');
      setAssignedToIds(user ? [user.id] : []);
      setListName('');
      setFile(null);
      setListAssignedToIds([]);
    }
  }, [open, fetchBrokers, user]);

  const brokersForSystemSelect = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.gerente) {
        return allBrokers.filter((u: any) => u.superiorId === user.id || u.id === user.id);
    }
    return allBrokers;
  }, [allBrokers, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let response;

    try {
      if (creationType === 'system') {
        if (!name || !source || assignedToIds.length === 0) {
          throw new Error("Nome, fonte e corretores são obrigatórios.");
        }
        response = await fetch('/api/active-offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creationType: 'system', name, source, assignedToIds }),
        });
      } else { // creationType === 'list'
        if (!listName || !file || listAssignedToIds.length === 0) {
          throw new Error("Nome, arquivo e corretores são obrigatórios.");
        }
        const formData = new FormData();
        formData.append('creationType', 'list');
        formData.append('name', listName);
        formData.append('file', file);
        listAssignedToIds.forEach(id => formData.append('assignedToIds', id));

        response = await fetch('/api/active-offers', {
          method: 'POST',
          body: formData, // O header 'Content-Type' é definido automaticamente pelo browser para multipart/form-data
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao criar campanha.');
      }

      toast({ title: 'Sucesso!', description: 'Campanha de Oferta Ativa criada com sucesso.' });
      onOfferCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSystemForm = () => (
    <>
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
            {[Role.gerente, Role.diretor, Role.marketing_adm].includes(user!.role) && <SelectItem value="equipe">Clientes da Minha Equipe</SelectItem>}
            {[Role.diretor, Role.marketing_adm].includes(user!.role) && <SelectItem value="sem_proprietario">Clientes Sem Proprietário</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="assignedTo">Atribuir Para</Label>
        {/* TODO: Implementar multi-select para corretores */}
        <Select onValueChange={(value) => setAssignedToIds([value])} defaultValue={user?.id}>
          <SelectTrigger><SelectValue placeholder="Selecione um corretor..." /></SelectTrigger>
          <SelectContent>{brokersForSystemSelect.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </>
  );

  const renderListForm = () => (
    <>
      <div>
        <Label htmlFor="listName">Nome da Campanha</Label>
        <Input id="listName" value={listName} onChange={(e) => setListName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="file-upload">Planilha de Contatos (.xlsx)</Label>
        <Input id="file-upload" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required />
        {file && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {file.name}</p>}
      </div>
      <div>
        <Label>Atribuir Para (Selecione um ou mais)</Label>
        <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-2">
          {allBrokers.map(broker => (
            <div key={broker.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`broker-${broker.id}`}
                value={broker.id}
                checked={listAssignedToIds.includes(broker.id)}
                onChange={(e) => {
                  const { value, checked } = e.target;
                  setListAssignedToIds(prev =>
                    checked ? [...prev, value] : prev.filter(id => id !== value)
                  );
                }}
              />
              <Label htmlFor={`broker-${broker.id}`}>{broker.nome}</Label>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Oferta Ativa</DialogTitle>
          <DialogDescription>Crie uma campanha a partir dos clientes do sistema ou de uma nova lista.</DialogDescription>
        </DialogHeader>

        <ToggleGroup type="single" value={creationType} onValueChange={(value: 'system' | 'list') => value && setCreationType(value)} className="grid grid-cols-2">
          <ToggleGroupItem value="system" aria-label="Criar a partir do sistema">
            <UsersIcon className="h-4 w-4 mr-2" />
            A partir do Sistema
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Criar a partir de lista">
            <FileText className="h-4 w-4 mr-2" />
            A partir de Lista
          </ToggleGroupItem>
        </ToggleGroup>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {creationType === 'system' ? renderSystemForm() : renderListForm()}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Criando...' : 'Criar Campanha'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
