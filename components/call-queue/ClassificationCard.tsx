// components/call-queue/ClassificationCard.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Mail, MessageSquare } from 'lucide-react';
import type { Outcome } from '@/lib/call-queue';

export function ClassificationCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const OUTCOME_OPTIONS: { value: Outcome; label: string }[] = [
  { value: 'NO_ANSWER', label: 'Não atendeu, devolver para oferta' },
  { value: 'NOT_INTERESTED', label: 'Não Interessado' },
  { value: 'INTERESTED', label: 'Cliente interessado (Vira Cliente)' },
  { value: 'NOT_A_CLIENT', label: 'Não cliente' },
  { value: 'SNOOZE', label: 'Ligar em 6 meses' },
];

interface QueueContact {
  fullName: string;
  phone: string | null;
  email: string | null;
}

interface PropertyOption {
  id: string;
  title: string;
}

interface ClassificationCardProps {
  contact: QueueContact;
  properties: PropertyOption[];
  submitting: boolean;
  // Imóvel padrão da campanha (ex.: mailing de um empreendimento específico) —
  // vem pré-selecionado, mas o corretor pode trocar.
  defaultPropertyId?: string;
  onSubmit: (payload: { outcome: Outcome; comment?: string; propertyOfInterestId?: string }, exitQueue: boolean) => void;
}

export default function ClassificationCard({ contact, properties, submitting, defaultPropertyId, onSubmit }: ClassificationCardProps) {
  const [outcome, setOutcome] = useState<Outcome | ''>('');
  const [comment, setComment] = useState('');
  const [propertyId, setPropertyId] = useState<string>(defaultPropertyId || '');

  // Re-sincroniza quando troca de contato na fila (o padrão pode ter mudado de campanha).
  useEffect(() => {
    setOutcome('');
    setComment('');
    setPropertyId(defaultPropertyId || '');
  }, [contact, defaultPropertyId]);

  const resetForm = () => {
    setOutcome('');
    setComment('');
    setPropertyId(defaultPropertyId || '');
  };

  const handleSave = (exitQueue: boolean) => {
    if (!outcome) return;
    onSubmit(
      {
        outcome,
        comment: comment || undefined,
        propertyOfInterestId: outcome === 'INTERESTED' && propertyId ? propertyId : undefined,
      },
      exitQueue,
    );
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{contact.fullName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" /> {contact.phone || 'N/A'}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> {contact.email || 'N/A'}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button asChild variant="outline" size="sm" disabled={!contact.phone}>
              <a href={`tel:${contact.phone}`}><Phone className="mr-2 h-4 w-4" /> Ligar</a>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={!contact.phone}>
              <a href={`https://wa.me/55${contact.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={!contact.email}>
              <a href={`mailto:${contact.email}`}><Mail className="mr-2 h-4 w-4" /> E-mail</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>Classificação</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {outcome === 'INTERESTED' && (
            <div>
              <Label>Imóvel de Interesse</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder="Selecione um imóvel..." /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Comentário</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anote o que foi conversado..." className="min-h-[100px]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button variant="outline" disabled={!outcome || submitting} onClick={() => handleSave(true)}>
              Salvar e sair da fila
            </Button>
            <Button disabled={!outcome || submitting} onClick={() => handleSave(false)}>
              Salvar e pedir próximo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
