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
  totalClients: number
  activeClients: number
  totalProperties: number
  conversionRate: number
}

interface Client {
  id: string
  nomeCompleto: string
  email?: string | null
  updatedAt: string
}

interface Property {
  id: string;
  titulo: string;
  endereco: string | null;
}

interface Task {
  id: string;
  titulo: string;
  dataHora: string;
  concluida: boolean;
  cliente: {
    id: string;
    nomeCompleto: string;
  }
}

interface Broker {
  id: string;
  nome: string;
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

  const [clientForm, setClientForm] = useState({ nomeCompleto: "", email: "", telefone: "", selectedCorretorId: "" })
  const [propertyForm, setPropertyForm] = useState({ titulo: "", endereco: "", preco: "" })
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
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast({ variant: "destructive", title: "Erro de Autenticação", description: "Token não encontrado. Por favor, faça login novamente." });
        return;
      }
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, overdueClientsRes, tasksRes, allClientsRes, brokersRes] = await Promise.all([
        fetch("/api/dashboard/stats", { headers }),
        fetch("/api/dashboard/overdue-clients", { headers }),
        fetch("/api/tasks", { headers }),
        fetch("/api/clients", { headers }),
        fetch("/api/users", { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (overdueClientsRes.ok) setOverdueClients(await overdueClientsRes.json());
      if (allClientsRes.ok) setClients((await allClientsRes.json()).clients || []);
      if (brokersRes.ok) setBrokers((await brokersRes.json()).users || []);

      if (tasksRes.ok) {
        const allTasks = await tasksRes.json();
        const now = new Date();
        setPendingTasks(allTasks.filter((task: Task) => !task.concluida && new Date(task.dataHora) >= now));
        setOverdueTasks(allTasks.filter((task: Task) => !task.concluida && new Date(task.dataHora) < now));
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

    const isManager = user && ['marketing_adm', 'diretor', 'gerente'].includes(user.role);

    if (isManager && !clientForm.selectedCorretorId) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, selecione um corretor responsável.",
      });
      return;
    }

    const corretorId = isManager ? clientForm.selectedCorretorId : user?.id;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          nomeCompleto: clientForm.nomeCompleto,
          email: clientForm.email,
          telefone: clientForm.telefone,
          corretorId: corretorId,
          currentFunnelStage: 'Contato'
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao criar cliente.");
      }
      toast({ title: "Sucesso!", description: "Cliente criado com sucesso." });
      setIsClientModalOpen(false);
      setClientForm({ nomeCompleto: "", email: "", telefone: "", selectedCorretorId: "" });
      fetchDashboardData(); // Re-fetch data
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...propertyForm, preco: parseFloat(propertyForm.preco) }),
      });
      if (!response.ok) throw new Error("Falha ao criar imóvel.");
      toast({ title: "Sucesso!", description: "Imóvel criado com sucesso." });
      setIsPropertyModalOpen(false);
      setPropertyForm({ titulo: "", endereco: "", preco: "" });
      fetchDashboardData(); // Re-fetch data
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
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
        <h1 className="text-3xl font-bold text-primary-custom flex items-center gap-2">
          👋 Olá, {user ? user.name : 'Usuário'}!
        </h1>
        <p className="text-gray-600">Aqui está um resumo das suas atividades e performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary-custom">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-primary-custom" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-custom">{stats.totalClients}</div>
            <p className="text-xs text-gray-500">Todos os clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-tertiary-custom">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clientes Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-tertiary-custom" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-tertiary-custom">{stats.activeClients}</div>
            <p className="text-xs text-gray-500">Em andamento no pipeline</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary-custom">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Imóveis</CardTitle>
            <Building2 className="h-4 w-4 text-secondary-custom" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-custom">{stats.totalProperties}</div>
            <p className="text-xs text-gray-500">Imóveis cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.conversionRate}%</div>
            <p className="text-xs text-gray-500">Clientes ativos vs total</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-primary-custom">Ações Rápidas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-primary-custom">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Plus className="h-6 w-6 text-primary-custom mb-2" />
                  <h3 className="font-medium text-primary-custom">Novo Cliente</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <form onSubmit={handleClientSubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="nomeCompleto">Nome Completo</Label><Input id="nomeCompleto" value={clientForm.nomeCompleto} onChange={(e) => setClientForm({ ...clientForm, nomeCompleto: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" value={clientForm.telefone} onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })} /></div>
                {user && ['marketing_adm', 'diretor', 'gerente'].includes(user.role) && (
                  <div className="space-y-2">
                    <Label htmlFor="corretor">Corretor Responsável</Label>
                    <Select
                      value={clientForm.selectedCorretorId}
                      onValueChange={(value) => setClientForm(p => ({ ...p, selectedCorretorId: value }))}
                    >
                      <SelectTrigger id="corretor" className="w-full">
                        <SelectValue placeholder="Selecione um corretor" />
                      </SelectTrigger>
                      <SelectContent>
                        {brokers.filter(b => b.role === 'corretor').map(broker => <SelectItem key={broker.id} value={broker.id}>{broker.nome}</SelectItem>)}
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
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-tertiary-custom">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Building2 className="h-6 w-6 text-tertiary-custom mb-2" />
                  <h3 className="font-medium text-tertiary-custom">Novo Imóvel</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Imóvel</DialogTitle></DialogHeader>
              <form onSubmit={handlePropertySubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="titulo">Título</Label><Input id="titulo" value={propertyForm.titulo} onChange={(e) => setPropertyForm({ ...propertyForm, titulo: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" value={propertyForm.endereco} onChange={(e) => setPropertyForm({ ...propertyForm, endereco: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="preco">Preço</Label><Input id="preco" type="number" value={propertyForm.preco} onChange={(e) => setPropertyForm({ ...propertyForm, preco: e.target.value })} /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsPropertyModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-secondary-custom">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Calendar className="h-6 w-6 text-secondary-custom mb-2" />
                  <h3 className="font-medium text-secondary-custom">Nova Tarefa</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-primary-custom">Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="title">Título *</Label><Input id="title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="clientId">Cliente *</Label><Select value={taskForm.clientId} onValueChange={(value) => setTaskForm({ ...taskForm, clientId: value })}><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger><SelectContent>{clients.map((client) => (<SelectItem key={client.id} value={client.id}>{client.nomeCompleto}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="dueDate">Data de Vencimento *</Label><Input id="dueDate" type="datetime-local" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancelar</Button><Button type="submit">Criar Tarefa</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Link href="/pipeline">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-green-500">
              <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                <ExternalLink className="h-6 w-6 text-green-500 mb-2" />
                <h3 className="font-medium text-green-500">Ver Pipeline</h3>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary-custom">Clientes em Atraso</CardTitle>
          </CardHeader>
          <CardContent className="h-72 overflow-y-auto space-y-4">
            {isDataLoading ? <p>Carregando...</p> : overdueClients.length > 0 ? (
              overdueClients.map(client => (
                <Link href={`/client/${client.id}`} key={client.id} className="block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{client.nomeCompleto}</p>
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">Nenhum cliente em atraso.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary-custom">Tarefas</CardTitle>
          </CardHeader>
          <CardContent className="h-72 overflow-y-auto p-0">
            <Tabs defaultValue="pendentes" className="w-full">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="pendentes">Pendentes</TabsTrigger><TabsTrigger value="atrasadas">Atrasadas</TabsTrigger></TabsList>
              <TabsContent value="pendentes" className="space-y-4 p-4">
                {isDataLoading ? <p>Carregando...</p> : pendingTasks.length > 0 ? (
                  pendingTasks.map(task => (
                    <Link href={task.cliente ? `/client/${task.cliente.id}` : '#'} key={task.id} className="block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{task.titulo}</p>
                        {task.cliente && <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{task.cliente.nomeCompleto}</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {format(new Date(task.dataHora), "dd/MM 'às' HH:mm")}</p>
                    </Link>
                  ))
                ) : <p className="text-center text-gray-500 py-8">Nenhuma tarefa pendente.</p>}
              </TabsContent>
              <TabsContent value="atrasadas" className="space-y-4 p-4">
                {isDataLoading ? <p>Carregando...</p> : overdueTasks.length > 0 ? (
                  overdueTasks.map(task => (
                    <Link href={task.cliente ? `/client/${task.cliente.id}` : '#'} key={task.id} className="block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-red-500">{task.titulo}</p>
                        {task.cliente && <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{task.cliente.nomeCompleto}</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3 text-red-500" /> {format(new Date(task.dataHora), "dd/MM 'às' HH:mm")}</p>
                    </Link>
                  ))
                ) : <p className="text-center text-gray-500 py-8">Nenhuma tarefa atrasada.</p>}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
