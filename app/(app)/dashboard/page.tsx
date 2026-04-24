// app/(app)/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, Building2, TrendingUp, Calendar, ExternalLink, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  hierarchicalTotalClients: number;
  hierarchicalActiveClients: number;
  totalProperties: number;
  conversionRate: number;
}

interface OverdueClient {
  id: string;
  fullName: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  dateTime: string;
  isCompleted: boolean;
  clientId: string;
  client: { id: string; fullName: string } | null;
}

interface Client {
  id: string;
  fullName: string;
}

interface Broker {
  id: string;
  name: string;
  role: string;
}

function StatCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

function TaskRowSkeleton() {
  return (
    <div className="p-3 rounded-md space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdueClients, setOverdueClients] = useState<OverdueClient[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Modal state — data fetched lazily when modal opens
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);

  const [clientForm, setClientForm] = useState({ fullName: "", email: "", phone: "", selectedbrokerId: "" });
  const [propertyForm, setPropertyForm] = useState({ title: "", endereco: "", price: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", clientId: "" });

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/dashboard/data", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar dados.");
      const data = await res.json();
      setStats(data.stats);
      setOverdueClients(data.overdueClients);
      setPendingTasks(data.pendingTasks);
      setOverdueTasks(data.overdueTasks);
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados do dashboard." });
    } finally {
      setIsDataLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  // Lazy-load clients when task modal opens
  useEffect(() => {
    if (!isTaskModalOpen || clients.length > 0) return;
    const token = localStorage.getItem("authToken");
    fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => null);
  }, [isTaskModalOpen, clients.length]);

  // Lazy-load brokers when client modal opens
  useEffect(() => {
    if (!isClientModalOpen || brokers.length > 0) return;
    const token = localStorage.getItem("authToken");
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setBrokers(d.users || []))
      .catch(() => null);
  }, [isClientModalOpen, brokers.length]);

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isManager = user && ["MARKETING_ADMIN", "diretor", "gerente"].includes(user.role);
    if (isManager && !clientForm.selectedbrokerId) {
      toast({ variant: "destructive", title: "Campo obrigatório", description: "Selecione um corretor responsável." });
      return;
    }
    const brokerId = isManager ? clientForm.selectedbrokerId : user?.id;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: clientForm.fullName, email: clientForm.email, phone: clientForm.phone, brokerId, currentFunnelStage: "Contato" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Falha ao criar cliente.");
      toast({ title: "Sucesso!", description: "Cliente criado com sucesso." });
      setIsClientModalOpen(false);
      setClientForm({ fullName: "", email: "", phone: "", selectedbrokerId: "" });
      fetchDashboardData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...propertyForm, price: parseFloat(propertyForm.price) }),
      });
      if (!res.ok) throw new Error("Falha ao criar imóvel.");
      toast({ title: "Sucesso!", description: "Imóvel criado com sucesso." });
      setIsPropertyModalOpen(false);
      setPropertyForm({ title: "", endereco: "", price: "" });
      fetchDashboardData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: taskForm.title, description: taskForm.description, dateTime: taskForm.dueDate, clientId: taskForm.clientId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao criar tarefa");
      toast({ title: "Sucesso!", description: "Tarefa criada com sucesso." });
      setIsTaskModalOpen(false);
      setTaskForm({ title: "", description: "", dueDate: "", clientId: "" });
      fetchDashboardData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-secondary-custom">
          👋 Olá, {user?.name ?? "Usuário"}!
        </h1>
        <p className="text-muted-foreground">Aqui está um resumo das suas atividades e performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isDataLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <Card className="border-l-4 border-l-secondary-custom">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Clientes</CardTitle>
                <Users className="h-4 w-4 text-secondary-custom" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.hierarchicalTotalClients ?? 0}</div>
                <p className="text-xs text-muted-foreground">Todos os clientes cadastrados</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{stats?.hierarchicalActiveClients ?? 0}</div>
                <p className="text-xs text-muted-foreground">Em andamento no pipeline</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-secondary-custom">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Imóveis</CardTitle>
                <Building2 className="h-4 w-4 text-secondary-custom" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary-custom">{stats?.totalProperties ?? 0}</div>
                <p className="text-xs text-muted-foreground">Imóveis cadastrados</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">{stats?.conversionRate ?? 0}%</div>
                <p className="text-xs text-muted-foreground">Clientes ativos vs total</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-secondary-custom">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg hover:shadow-secondary-custom/10 transition-all duration-200 border-2 border-dashed border-border/40 hover:border-secondary-custom/60">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Plus className="h-6 w-6 text-secondary-custom mb-2" />
                  <h3 className="font-medium">Novo Cliente</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <form onSubmit={handleClientSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Nome Completo</Label><Input value={clientForm.fullName} onChange={e => setClientForm({ ...clientForm, fullName: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
                {user && ["MARKETING_ADMIN", "diretor", "gerente"].includes(user.role) && (
                  <div className="space-y-2">
                    <Label>Corretor Responsável</Label>
                    <Select value={clientForm.selectedbrokerId} onValueChange={v => setClientForm(p => ({ ...p, selectedbrokerId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
                      <SelectContent>{brokers.filter(b => b.role === "BROKER").map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsClientModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPropertyModalOpen} onOpenChange={setIsPropertyModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg hover:shadow-blue-400/10 transition-all duration-200 border-2 border-dashed border-border/40 hover:border-blue-400/60">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Building2 className="h-6 w-6 text-blue-400 mb-2" />
                  <h3 className="font-medium">Novo Imóvel</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Imóvel</DialogTitle></DialogHeader>
              <form onSubmit={handlePropertySubmit} className="space-y-4">
                <div className="space-y-2"><Label>Título</Label><Input value={propertyForm.title} onChange={e => setPropertyForm({ ...propertyForm, title: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Endereço</Label><Input value={propertyForm.endereco} onChange={e => setPropertyForm({ ...propertyForm, endereco: e.target.value })} /></div>
                <div className="space-y-2"><Label>Preço</Label><Input type="number" value={propertyForm.price} onChange={e => setPropertyForm({ ...propertyForm, price: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsPropertyModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg hover:shadow-secondary-custom/10 transition-all duration-200 border-2 border-dashed border-border/40 hover:border-secondary-custom/60">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Calendar className="h-6 w-6 text-secondary-custom mb-2" />
                  <h3 className="font-medium">Nova Tarefa</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Nova Tarefa</DialogTitle></DialogHeader>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Título *</Label><Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={taskForm.clientId} onValueChange={v => setTaskForm({ ...taskForm, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Data e Hora *</Label><Input type="datetime-local" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Criar Tarefa</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Link href="/pipeline">
            <Card className="cursor-pointer hover:shadow-lg hover:shadow-emerald-400/10 transition-all duration-200 border-2 border-dashed border-border/40 hover:border-emerald-400/60">
              <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                <ExternalLink className="h-6 w-6 text-emerald-400 mb-2" />
                <h3 className="font-medium">Ver Pipeline</h3>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-secondary-custom">Clientes em Atraso</CardTitle>
          </CardHeader>
          <CardContent className="h-72 overflow-y-auto space-y-2">
            {isDataLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)
            ) : overdueClients.length > 0 ? (
              overdueClients.map(client => (
                <Link href={`/client/${client.id}`} key={client.id} className="block p-3 rounded-md hover:bg-accent">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{client.fullName}</p>
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">Nenhum cliente em atraso.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-secondary-custom">Tarefas</CardTitle>
          </CardHeader>
          <CardContent className="h-72 overflow-y-auto p-0">
            <Tabs defaultValue="pendentes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                <TabsTrigger value="atrasadas">Atrasadas</TabsTrigger>
              </TabsList>
              <TabsContent value="pendentes" className="space-y-1 p-3">
                {isDataLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <TaskRowSkeleton key={i} />)
                ) : pendingTasks.length > 0 ? (
                  pendingTasks.map(task => (
                    <Link href={task.client ? `/client/${task.client.id}` : "#"} key={task.id} className="block p-3 rounded-md hover:bg-accent">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{task.title}</p>
                        {task.client && <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{task.client.fullName}</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.dateTime), "dd/MM 'às' HH:mm")}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma tarefa pendente.</p>
                )}
              </TabsContent>
              <TabsContent value="atrasadas" className="space-y-1 p-3">
                {isDataLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <TaskRowSkeleton key={i} />)
                ) : overdueTasks.length > 0 ? (
                  overdueTasks.map(task => (
                    <Link href={task.client ? `/client/${task.client.id}` : "#"} key={task.id} className="block p-3 rounded-md hover:bg-accent">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-red-500">{task.title}</p>
                        {task.client && <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{task.client.fullName}</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        {format(new Date(task.dateTime), "dd/MM 'às' HH:mm")}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma tarefa atrasada.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
