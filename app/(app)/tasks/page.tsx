"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Clock, User, AlertCircle } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  priority: "baixa" | "media" | "alta" | "urgente"
  status: "pendente" | "em_andamento" | "concluida"
  dueDate: string
  clientId: string
  clientName?: string
  createdAt: string
}

interface Client {
  id: string
  name: string
  email: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "",
    dueDate: "",
    clientId: "",
  })

  useEffect(() => {
    fetchTasks()
    fetchClients()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients")
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
        setIsModalOpen(false)
        setTaskForm({
          title: "",
          description: "",
          priority: "",
          dueDate: "",
          clientId: "",
        })
        fetchTasks()
        alert("Tarefa criada com sucesso!")
      } else {
        alert("Erro ao criar tarefa")
      }
    } catch (error) {
      console.error("Erro ao criar tarefa:", error)
      alert("Erro ao criar tarefa")
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "baixa":
        return "bg-green-100 text-green-800"
      case "media":
        return "bg-yellow-100 text-yellow-800"
      case "alta":
        return "bg-orange-100 text-orange-800"
      case "urgente":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-gray-100 text-gray-800"
      case "em_andamento":
        return "bg-blue-100 text-blue-800"
      case "concluida":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-custom">Tarefas</h1>
          <p className="text-gray-600">Gerencie suas atividades e compromissos</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto scrollbar-custom">
            <DialogHeader>
              <DialogTitle className="text-primary-custom">Criar Nova Tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                  Criar Tarefa
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-gray-500 text-center mb-4">
                  Comece criando sua primeira tarefa para organizar suas atividades.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-secondary-custom hover:bg-secondary-custom/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Tarefa
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-primary-custom line-clamp-2">
                    {task.title}
                  </CardTitle>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-600 text-sm line-clamp-3">{task.description}</p>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span>{task.clientName || "Cliente não encontrado"}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(task.dueDate).toLocaleString("pt-BR")}</span>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  
                  {new Date(task.dueDate) < new Date() && task.status !== "concluida" && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>Atrasada</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
