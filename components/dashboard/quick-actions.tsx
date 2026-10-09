"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Calendar, ChevronDown, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { TaskReminderFields } from "@/components/tasks/task-reminder-fields";
import { useToast } from "@/components/ui/use-toast";
import type { BrokerOption } from "./types";

interface ClientOption {
  id: string;
  fullName: string;
}

const emptyClient = { fullName: "", email: "", phone: "", brokerId: "" };
const emptyTask: {
  title: string;
  description: string;
  dueDate: string;
  clientId: string;
  reminderMinutesBefore: number | null;
  overdueRepeatMinutes: number | null;
} = { title: "", description: "", dueDate: "", clientId: "", reminderMinutesBefore: null, overdueRepeatMinutes: null };

export function QuickActions({
  currentUserId,
  brokers,
  canAssignBroker,
  onChanged,
}: {
  currentUserId: string;
  /** Corretores para quem o usuário pode atribuir um cliente novo. */
  brokers: BrokerOption[];
  canAssignBroker: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientForm, setClientForm] = useState(emptyClient);
  const [taskForm, setTaskForm] = useState(emptyTask);

  // Lista de clientes só é buscada quando o modal de tarefa abre.
  useEffect(() => {
    if (!isTaskOpen || clients.length > 0) return;
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => null);
  }, [isTaskOpen, clients.length]);

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canAssignBroker && !clientForm.brokerId) {
      toast({ variant: "destructive", title: "Campo obrigatório", description: "Selecione um corretor responsável." });
      return;
    }
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: clientForm.fullName,
          email: clientForm.email,
          phone: clientForm.phone,
          brokerId: canAssignBroker ? clientForm.brokerId : currentUserId,
          currentFunnelStage: "Contato",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Falha ao criar cliente.");
      toast({ title: "Sucesso!", description: "Cliente criado com sucesso." });
      setIsClientOpen(false);
      setClientForm(emptyClient);
      onChanged();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.clientId) {
      toast({ variant: "destructive", title: "Campo obrigatório", description: "Selecione o cliente da tarefa." });
      return;
    }
    if (!taskForm.dueDate) {
      toast({ variant: "destructive", title: "Campo obrigatório", description: "Selecione a data e hora da tarefa." });
      return;
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          dateTime: taskForm.dueDate,
          clientId: taskForm.clientId,
          reminderMinutesBefore: taskForm.reminderMinutesBefore,
          overdueRepeatMinutes: taskForm.overdueRepeatMinutes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao criar tarefa");
      toast({ title: "Sucesso!", description: "Tarefa criada com sucesso." });
      setIsTaskOpen(false);
      setTaskForm(emptyTask);
      onChanged();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  return (
    <>
      {/* Um botão só: pipeline, tarefas e imóveis já estão no menu lateral. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-11 rounded-full px-5">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />Novo
            <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setIsTaskOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />Tarefa
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsClientOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />Cliente
          </DropdownMenuItem>
          {/* Imóvel tem tipologias e fotos: abre o cadastro completo em vez de um formulário rápido. */}
          <DropdownMenuItem asChild>
            <Link href="/properties/new">
              <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />Imóvel
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qa-task-title">Título *</Label>
              <Input id="qa-task-title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-task-client">Cliente *</Label>
              <Select value={taskForm.clientId} onValueChange={v => setTaskForm({ ...taskForm, clientId: v })}>
                <SelectTrigger id="qa-task-client"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data e hora *</Label>
              <DateTimePicker value={taskForm.dueDate} onChange={v => setTaskForm({ ...taskForm, dueDate: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-task-description">Descrição</Label>
              <Textarea id="qa-task-description" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
            <TaskReminderFields
              reminderMinutesBefore={taskForm.reminderMinutesBefore}
              onReminderMinutesBeforeChange={v => setTaskForm({ ...taskForm, reminderMinutesBefore: v })}
              overdueRepeatMinutes={taskForm.overdueRepeatMinutes}
              onOverdueRepeatMinutesChange={v => setTaskForm({ ...taskForm, overdueRepeatMinutes: v })}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTaskOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar tarefa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleClientSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qa-client-name">Nome completo *</Label>
              <Input id="qa-client-name" value={clientForm.fullName} onChange={e => setClientForm({ ...clientForm, fullName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-client-email">Email</Label>
              <Input id="qa-client-email" type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-client-phone">Telefone</Label>
              <Input id="qa-client-phone" type="tel" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
            </div>
            {canAssignBroker && (
              <div className="space-y-2">
                <Label htmlFor="qa-client-broker">Corretor responsável *</Label>
                <Select value={clientForm.brokerId} onValueChange={v => setClientForm(p => ({ ...p, brokerId: v }))}>
                  <SelectTrigger id="qa-client-broker"><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
                  <SelectContent>{brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsClientOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}
