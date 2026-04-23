// app/(app)/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Users, Building2, TrendingUp, Calendar, ExternalLink, AlertCircle, Clock } from 'lucide-react'
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalProperties: number;
  conversionRate: number;
  hierarchicalTotalClients: number;
  hierarchicalActiveClients: number;
}

interface Client {
  id: string
  fullName: string
  email?: string | null
  updatedAt: string
}

interface Property {
  id: string;
  title: string;
  endereco: string | null;
}

interface Task {
  id: string;
  title: string;
  dateTime: string;
  concluida: boolean;
  cliente: {
    id: string;
    fullName: string;
  }
}

interface Broker {
  id: string;
  name: string;
  role: string;
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalProperties: 0,
    conversionRate: 0,
    hierarchicalTotalClients: 0,
    hierarchicalActiveClients: 0,
  })
  const [clients, setClients] = useState<Client[]>([])
  const [overdueClients, setOverdueClients] = useState<Client[]>([])
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true)

  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const [clientForm, setClientForm] = useState({ fullName: "", email: "", phone: "", selectedbrokerId: "" })
  const [propertyForm, setPropertyForm] = useState({ title: "", endereco: "", price: "" })
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    clientId: "",
  })

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const [statsRes, overdueClientsRes, tasksRes, allClientsRes, brokersRes] = await Promise.all([
        fetch(`/api/dashboard/stats`),
        fetch("/api/dashboard/overdue-clients"),
        fetch("/api/tasks"),
        fetch("/api/clients"),
        fetch("/api/users"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (overdueClientsRes.ok) setOverdueClients(await overdueClientsRes.json());
      if (allClientsRes.ok) setClients((await allClientsRes.json()).clients || []);
      if (brokersRes.ok) setBrokers((await brokersRes.json()).users || []);

      if (tasksRes.ok) {
        const allTasks = await tasksRes.json();
        const now = new Date();
        setPendingTasks(allTasks.filter((task: Task) => !task.concluida && new Date(task.dateTime) >= now));
        setOverdueTasks(allTasks.filter((task: Task) => !task.concluida && new Date(task.dateTime) < now));
      }

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados do dashboard." });
    } finally {
      setIsDataLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isManager = user && ['MARKETING_ADMIN', 'diretor', 'gerente'].includes(user.role);

    if (isManager && !clientForm.selectedbrokerId) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, selecione um BROKER responsável.",
      });
      return;
    }

    const brokerId = isManager ? clientForm.selectedbrokerId : user?.id;

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fullName: clientForm.fullName,
          email: clientForm.email,
          phone: clientForm.phone,
          brokerId: brokerId,
          currentFunnelStage: 'Contato'
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao criar cliente.");
      }
      toast({ title: "Sucesso!", description: "Cliente criado com sucesso." });
      setIsClientModalOpen(false);
      setClientForm({ fullName: "", email: "", phone: "", selectedbrokerId: "" });
      fetchDashboardData(); // Re-fetch data
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...propertyForm, price: parseFloat(propertyForm.price) }),
      });
      if (!response.ok) throw new Error("Falha ao criar imóvel.");
      toast({ title: "Sucesso!", description: "Imóvel criado com sucesso." });
      setIsPropertyModalOpen(false);
      setPropertyForm({ title: "", endereco: "", price: "" });
      fetchDashboardData(); // Re-fetch data
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: taskForm.title,
          description: taskForm.description,
          due_date: taskForm.dueDate,
          client_id: taskForm.clientId,
        }),
      })

      if (response.ok) {
        setIsTaskModalOpen(false)
        setTaskForm({
          title: "",
          description: "",
          dueDate: "",
          clientId: "",
        })
        toast({ title: "Sucesso!", description: "Tarefa criada com sucesso." });
        fetchDashboardData(); // Re-fetch data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar tarefa");
      }
    } catch (error: any) {
      console.error("Erro ao criar tarefa:", error);
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível criar a tarefa." });
    }
  }

  if (isAuthLoading) {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom"></div>
        </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-secondary-custom flex items-center gap-2">
          👋 Olá, {user ? user.name : 'Usuário'}!
        </h1>
        <p className="text-muted-foreground">Aqui está um resumo das suas atividades e performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-secondary-custom">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-secondary-custom" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.hierarchicalTotalClients}</div>
            <p className="text-xs text-muted-foreground">Todos os clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.hierarchicalActiveClients}</div>
            <p className="text-xs text-muted-foreground">Em andamento no pipeline</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary-custom">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Imóveis</CardTitle>
            <Building2 className="h-4 w-4 text-secondary-custom" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-custom">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">Imóveis cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Clientes ativos vs total</p>
          </CardContent>
        </Card>
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
                  <h3 className="font-medium text-foreground">Novo Cliente</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <form onSubmit={handleClientSubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="fullName">Nome Completo</Label><Input id="fullName" value={clientForm.fullName} onChange={(e) => setClientForm({ ...clientForm, fullName: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
                {user && ['MARKETING_ADMIN', 'diretor', 'gerente'].includes(user.role) && (
                  <div className="space-y-2">
                    <Label htmlFor="BROKER">Corretor Responsável</Label>
                    <Select
                      value={clientForm.selectedbrokerId}
                      onValueChange={(value) => setClientForm(p => ({ ...p, selectedbrokerId: value }))}
                    >
                      <SelectTrigger id="BROKER" className="w-full">
                        <SelectValue placeholder="Selecione um BROKER" />
                      </SelectTrigger>
                      <SelectContent>
                        {brokers.filter(b => b.role === 'BROKER').map(broker => <SelectItem key={broker.id} value={broker.id}>{broker.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsClientModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPropertyModalOpen} onOpenChange={setIsPropertyModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg hover:shadow-blue-400/10 transition-all duration-200 border-2 border-dashed border-border/40 hover:border-blue-400/60">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Building2 className="h-6 w-6 text-blue-400 mb-2" />
                  <h3 className="font-medium text-foreground">Novo Imóvel</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Imóvel</DialogTitle></DialogHeader>
              <form onSubmit={handlePropertySubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="title">Título</Label><Input id="title" value={propertyForm.title} onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" value={propertyForm.endereco} onChange={(e) => setPropertyForm({ ...propertyForm, endereco: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="price">Preço</Label><Input id="price" type="number" value={propertyForm.price} onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })} /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsPropertyModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg hover:shadow-secondary-custom/10 transition-all duration-200 border-2 border-dashed border-border/40 hover:border-secondary-custom/60">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Calendar className="h-6 w-6 text-secondary-custom mb-2" />
                  <h3 className="font-medium text-foreground">Nova Tarefa</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-primary-custom">Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="title">Título *</Label><Input id="title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="clientId">Cliente *</Label><Select value={taskForm.clientId} onValueChange={(value) => setTaskForm({ ...taskForm, clientId: value })}><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger><SelectContent>{clients.map((client) => (<SelectItem key={client.id} value={client.id}>{client.fullName}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="dueDate">Data de Vencimento *</Label><Input id="dueDate" type="datetime-local" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancelar</Button><Button type="submit">Criar Tarefa</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Link href="/pipeline">
            <Card className="cursor-pointer hover:shadow-lg hover:shadow-emerald-400/10 transition-all duration-200 border-2 border-dashed border-border/40 hover:border-emerald-400/60">
              <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                <ExternalLink className="h-6 w-6 text-emerald-400 mb-2" />
                <h3 className="font-medium text-foreground">Ver Pipeline</h3>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-secondary-custom">Clientes em Atraso</CardTitle>
          </CardHeader>
          <CardContent className="h-72 overflow-y-auto space-y-4">
            {isDataLoading ? <p>Carregando...</p> : overdueClients.length > 0 ? (
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
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="pendentes">Pendentes</TabsTrigger><TabsTrigger value="atrasadas">Atrasadas</TabsTrigger></TabsList>
              <TabsContent value="pendentes" className="space-y-4 p-4">
                {isDataLoading ? <p>Carregando...</p> : pendingTasks.length > 0 ? (
                  pendingTasks.map(task => (
                    <Link href={task.cliente ? `/client/${task.cliente.id}` : '#'} key={task.id} className="block p-3 rounded-md hover:bg-accent">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{task.title}</p>
                        {task.cliente && <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{task.cliente.fullName}</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {format(new Date(task.dateTime), "dd/MM 'às' HH:mm")}</p>
                    </Link>
                  ))
                ) : <p className="text-center text-muted-foreground py-8">Nenhuma tarefa pendente.</p>}
              </TabsContent>
              <TabsContent value="atrasadas" className="space-y-4 p-4">
                {isDataLoading ? <p>Carregando...</p> : overdueTasks.length > 0 ? (
                  overdueTasks.map(task => (
                    <Link href={task.cliente ? `/client/${task.cliente.id}` : '#'} key={task.id} className="block p-3 rounded-md hover:bg-accent">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-red-500">{task.title}</p>
                        {task.cliente && <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{task.cliente.fullName}</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3 text-red-500" /> {format(new Date(task.dateTime), "dd/MM 'às' HH:mm")}</p>
                    </Link>
                  ))
                ) : <p className="text-center text-muted-foreground py-8">Nenhuma tarefa atrasada.</p>}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
