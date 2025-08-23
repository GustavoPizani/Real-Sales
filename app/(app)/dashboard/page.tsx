"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context" // 1. IMPORTAR O useAuth
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Users, Building2, TrendingUp, Calendar, ExternalLink } from 'lucide-react'
import Link from "next/link"

interface DashboardStats {
  totalClients: number
  activeClients: number
  totalProperties: number
  conversionRate: number
}

interface Client {
  id: string
  name: string
  email: string
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth() // 2. PEGAR O USUÁRIO LOGADO E O ESTADO DE CARREGAMENTO

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalProperties: 0,
    conversionRate: 0,
  })
  const [clients, setClients] = useState<Client[]>([])
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "",
    dueDate: "",
    clientId: "",
  })

  useEffect(() => {
    // Só busca os dados se o usuário estiver logado
    if (user) {
      fetchStats()
      fetchClients()
    }
  }, [user]) // Roda o efeito quando o usuário for definido

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients")
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || []) // Garante que clients seja um array
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    }
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!taskForm.title || !taskForm.description || !taskForm.priority || !taskForm.dueDate || !taskForm.clientId) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskForm),
      })

      if (response.ok) {
        setIsTaskModalOpen(false)
        setTaskForm({
          title: "",
          description: "",
          priority: "",
          dueDate: "",
          clientId: "",
        })
        alert("Tarefa criada com sucesso!")
      } else {
        alert("Erro ao criar tarefa")
      }
    } catch (error) {
      console.error("Erro ao criar tarefa:", error)
      alert("Erro ao criar tarefa")
    }
  }

  // Mostra uma tela de carregamento enquanto o estado de autenticação é verificado
  if (isAuthLoading) {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom"></div>
        </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header - CORRIGIDO */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-primary-custom flex items-center gap-2">
          {/* 3. EXIBIR O NOME DO USUÁRIO DINAMICAMENTE */}
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
        <p className="text-gray-600">Acesse rapidamente as funcionalidades mais utilizadas</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/clients/new">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-primary-custom">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Plus className="h-8 w-8 text-primary-custom mb-2" />
                <h3 className="font-medium text-primary-custom">Novo Cliente</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/properties/new">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-tertiary-custom">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Building2 className="h-8 w-8 text-tertiary-custom mb-2" />
                <h3 className="font-medium text-tertiary-custom">Novo Imóvel</h3>
              </CardContent>
            </Card>
          </Link>

          <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-secondary-custom">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <Calendar className="h-8 w-8 text-secondary-custom mb-2" />
                  <h3 className="font-medium text-secondary-custom">Nova Tarefa</h3>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto scrollbar-custom">
              <DialogHeader>
                <DialogTitle className="text-primary-custom">Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-primary-custom">
                      Título da Tarefa *
                    </Label>
                    <Input
                      id="title"
                      placeholder="Ex: Ligar para cliente João"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-primary-custom">
                      Prioridade *
                    </Label>
                    <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate" className="text-primary-custom">
                      Data de Vencimento *
                    </Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId" className="text-primary-custom">
                      Cliente *
                    </Label>
                    <Select value={taskForm.clientId} onValueChange={(value) => setTaskForm({ ...taskForm, clientId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-primary-custom">
                    Descrição *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva os detalhes da tarefa..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                    Criar Tarefa
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Link href="/pipeline">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-dashed border-gray-300 hover:border-green-500">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <ExternalLink className="h-8 w-8 text-green-500 mb-2" />
                <h3 className="font-medium text-green-500">Ver Pipeline</h3>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary-custom">Clientes Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Nenhum cliente encontrado
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary-custom">Imóveis Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Nenhum imóvel encontrado
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary-custom">Tarefas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Nenhuma tarefa encontrada
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
