"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Home,
  Building,
  Kanban,
  CheckSquare,
  Users,
  Settings,
  Plus,
  Search,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mockData = {
  stats: [
    { title: "Total de Clientes", value: "1,234", change: "+12%", icon: Users, color: "text-blue-600" },
    { title: "Imóveis Ativos", value: "856", change: "+8%", icon: Building, color: "text-green-600" },
    { title: "Vendas do Mês", value: "R$ 2.4M", change: "+23%", icon: DollarSign, color: "text-purple-600" },
    { title: "Taxa de Conversão", value: "18.2%", change: "+5%", icon: TrendingUp, color: "text-orange-600" },
  ],
  clients: [
    {
      id: "1",
      name: "Maria Silva",
      email: "maria@email.com",
      phone: "(11) 99999-9999",
      status: "Contato",
      property: "Apartamento 3 quartos Vila Madalena",
      price: 850000,
      notes: "Interessada em apartamento 3 quartos",
    },
    {
      id: "2",
      name: "João Santos",
      email: "joao@email.com",
      phone: "(11) 88888-8888",
      status: "Proposta",
      property: "Casa 4 quartos Jardins",
      price: 1200000,
      notes: "Procura casa com quintal",
    },
    {
      id: "3",
      name: "Ana Costa",
      email: "ana@email.com",
      phone: "(11) 77777-7777",
      status: "Visitado",
      property: "Cobertura Duplex Moema",
      price: 2500000,
      notes: "Cliente VIP, muito interessada",
    },
  ],
  properties: [
    {
      id: "1",
      title: "Apartamento 3 quartos Vila Madalena",
      address: "Rua Harmonia, 123 - Vila Madalena",
      price: 850000,
      type: "Apartamento",
      status: "Disponível",
    },
    {
      id: "2",
      title: "Casa 4 quartos Jardins",
      address: "Rua Augusta, 456 - Jardins",
      price: 1200000,
      type: "Casa",
      status: "Reservado",
    },
    {
      id: "3",
      title: "Cobertura Duplex Moema",
      address: "Av. Ibirapuera, 789 - Moema",
      price: 2500000,
      type: "Cobertura",
      status: "Disponível",
    },
  ],
  tasks: [
    {
      id: "1",
      title: "Ligar para Maria Silva",
      client: "Maria Silva",
      type: "call",
      priority: "high",
      time: "09:00",
      status: "pending",
    },
    {
      id: "2",
      title: "Visita ao apartamento com João",
      client: "João Santos",
      type: "visit",
      priority: "medium",
      time: "14:00",
      status: "pending",
    },
    {
      id: "3",
      title: "Follow-up Ana Costa",
      client: "Ana Costa",
      type: "follow_up",
      priority: "low",
      time: "16:30",
      status: "completed",
    },
  ],
}

const navigation = [
  { name: "Dashboard", icon: Home, active: false },
  { name: "Pipeline", icon: Kanban, active: false },
  { name: "Tarefas", icon: CheckSquare, active: false },
  { name: "Imóveis", icon: Building, active: false },
  { name: "Usuários", icon: Users, active: false },
  { name: "Configurações", icon: Settings, active: false },
]

export default function CRMDemo() {
  const [currentView, setCurrentView] = useState("dashboard")
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  const getStatusColor = (status: string) => {
    const colors = {
      Contato: "bg-blue-100 text-blue-800",
      Diagnóstico: "bg-yellow-100 text-yellow-800",
      Agendado: "bg-purple-100 text-purple-800",
      Visitado: "bg-orange-100 text-orange-800",
      Proposta: "bg-indigo-100 text-indigo-800",
      Contrato: "bg-green-100 text-green-800",
      Disponível: "bg-green-100 text-green-800",
      Reservado: "bg-yellow-100 text-yellow-800",
      Vendido: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    }
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />
      case "visit":
        return <MapPin className="h-4 w-4" />
      case "follow_up":
        return <Mail className="h-4 w-4" />
      default:
        return <CheckSquare className="h-4 w-4" />
    }
  }

  const Sidebar = () => (
    <div
      className={cn(
        "bg-slate-900 text-white h-screen flex flex-col transition-all duration-300",
        sidebarExpanded ? "w-64" : "w-16",
      )}
    >
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building className="h-5 w-5 text-white" />
          </div>
          {sidebarExpanded && (
            <div>
              <h1 className="text-lg font-bold">RealSales</h1>
              <p className="text-xs text-gray-400">CRM Imobiliário</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.name.toLowerCase()

            return (
              <li key={item.name}>
                <button
                  onClick={() => setCurrentView(item.name.toLowerCase())}
                  className={cn(
                    "flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span className="ml-3">{item.name}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">A</span>
          </div>
          {sidebarExpanded && (
            <div className="flex-1">
              <p className="text-sm font-medium">Admin Sistema</p>
              <p className="text-xs text-gray-400">Administrador</p>
            </div>
          )}
        </div>

        <Button variant="ghost" className="w-full text-gray-300 hover:bg-slate-800 hover:text-white justify-start">
          <LogOut className="h-4 w-4" />
          {sidebarExpanded && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </div>
  )

  const DashboardView = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do seu negócio imobiliário</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {mockData.stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="bg-slate-900 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-gray-400">
                      <span className="text-green-400">{stat.change}</span> vs mês anterior
                    </p>
                  </div>
                  <Icon className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Leads Recentes</CardTitle>
            <CardDescription>Novos interessados nos últimos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.clients.slice(0, 3).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{client.name}</h4>
                      <Badge className={getStatusColor(client.status)}>{client.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Interesse: {client.property}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ver detalhes
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agenda de Hoje
            </CardTitle>
            <CardDescription>Suas tarefas para hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    {getTaskIcon(task.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-gray-600">Cliente: {task.client}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-blue-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">{task.time}</span>
                    </div>
                    {task.status === "pending" && (
                      <Button size="sm" variant="outline" className="border-green-500 text-green-600 bg-transparent">
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const PipelineView = () => (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
            <p className="text-gray-600">Gerencie seus clientes através do funil de vendas</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Buscar clientes..." className="pl-10" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {["Contato", "Diagnóstico", "Agendado", "Visitado", "Proposta", "Contrato"].map((stage, index) => (
          <div key={stage} className="flex-1 flex flex-col">
            <div
              className={cn(
                "px-4 py-3 text-center border-r text-white",
                index === 0
                  ? "bg-blue-600"
                  : index === 1
                    ? "bg-yellow-600"
                    : index === 2
                      ? "bg-purple-600"
                      : index === 3
                        ? "bg-orange-600"
                        : index === 4
                          ? "bg-indigo-600"
                          : "bg-green-600",
              )}
            >
              <h3 className="font-semibold text-sm">{stage}</h3>
              <p className="text-xs opacity-90 mt-1">
                {index === 0 ? "2" : index === 2 ? "1" : "0"} cliente{index === 0 ? "s" : ""}
              </p>
            </div>

            <div className="flex-1 p-3 bg-white border-r">
              {index === 0 && (
                <div className="space-y-3">
                  {mockData.clients.slice(0, 2).map((client) => (
                    <Card key={client.id} className="cursor-pointer hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-sm">{client.name}</h4>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            15/01
                          </div>
                        </div>

                        <div className="flex items-center mb-2">
                          <Phone className="h-3 w-3 text-gray-400 mr-2" />
                          <span className="text-xs">{client.phone}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto">
                            <MessageCircle className="h-3 w-3 text-green-600" />
                          </Button>
                        </div>

                        <div className="flex items-center mb-3">
                          <Mail className="h-3 w-3 text-gray-400 mr-2" />
                          <span className="text-xs truncate">{client.email}</span>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-start">
                            <Building className="h-3 w-3 text-gray-400 mr-2 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium mb-1">{client.property}</p>
                              <p className="text-xs font-semibold text-green-600">
                                R$ {client.price.toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">{client.notes}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {index === 2 && (
                <Card className="cursor-pointer hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-sm">{mockData.clients[2].name}</h4>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        13/01
                      </div>
                    </div>

                    <div className="flex items-center mb-2">
                      <Phone className="h-3 w-3 text-gray-400 mr-2" />
                      <span className="text-xs">{mockData.clients[2].phone}</span>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-start">
                        <Building className="h-3 w-3 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium mb-1">{mockData.clients[2].property}</p>
                          <p className="text-xs font-semibold text-green-600">
                            R$ {mockData.clients[2].price.toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const PropertiesView = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Imóveis</h1>
          <p className="text-gray-600">Gerencie seu portfólio de imóveis</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Imóvel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Imóveis</p>
                <p className="text-2xl font-bold">{mockData.properties.length}</p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disponíveis</p>
                <p className="text-2xl font-bold text-green-600">2</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reservados</p>
                <p className="text-2xl font-bold text-yellow-600">1</p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vendidos</p>
                <p className="text-2xl font-bold text-red-600">0</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-red-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Imóveis ({mockData.properties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.properties.map((property) => (
                <TableRow key={property.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{property.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{property.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-sm">{property.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        R$ {property.price.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  const TasksView = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-gray-600">Gerencie suas atividades e compromissos</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Hoje</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-200">Atrasadas</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Futuras</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Clock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200">Concluídas</p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Hoje (2)</TabsTrigger>
          <TabsTrigger value="overdue">Atrasadas (0)</TabsTrigger>
          <TabsTrigger value="upcoming">Futuras (0)</TabsTrigger>
          <TabsTrigger value="completed">Concluídas (1)</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {mockData.tasks
            .filter((t) => t.status === "pending")
            .map((task) => (
              <Card key={task.id} className="hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                        {getTaskIcon(task.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <div className="flex items-center gap-1 mt-2">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{task.client}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      <Badge variant="outline">{task.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <Clock className="h-3 w-3" />
                        {task.time}
                      </div>
                      <Button size="sm" variant="outline" className="border-green-500 text-green-600 bg-transparent">
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  )

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView />
      case "pipeline":
        return <PipelineView />
      case "imóveis":
        return <PropertiesView />
      case "tarefas":
        return <TasksView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{renderCurrentView()}</main>
    </div>
  )
}
