"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Plus, MessageCircle, Building, Search, Mail, User, CalendarIcon, Phone, Filter, X } from "lucide-react"
import { type Client, type Property, type User as UserType, FUNNEL_STAGES } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

// Mock data
const mockClients: Client[] = [
  {
    id: "1",
    full_name: "Maria Silva",
    phone: "(11) 99999-9999",
    email: "maria@email.com",
    funnel_status: "Contato",
    notes: "Interessada em apartamento 3 quartos",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    user_id: "1",
    property_title: "Apartamento 3 quartos Vila Madalena",
    property_address: "Rua Harmonia, 123 - Vila Madalena",
    property_price: 850000,
    assigned_user: {
      id: "1",
      name: "João Corretor",
      email: "joao@email.com",
      role: "corretor",
      created_at: "2024-01-01T00:00:00Z",
    },
    status: "active",
  },
  {
    id: "2",
    full_name: "Carlos Santos",
    phone: "(11) 88888-8888",
    email: "carlos@email.com",
    funnel_status: "Diagnóstico",
    notes: "Procura casa com quintal",
    created_at: "2024-01-14T10:00:00Z",
    updated_at: "2024-01-14T10:00:00Z",
    user_id: "1",
    property_title: "Casa 4 quartos Jardins",
    property_address: "Rua Augusta, 456 - Jardins",
    property_price: 1200000,
    assigned_user: {
      id: "1",
      name: "João Corretor",
      email: "joao@email.com",
      role: "corretor",
      created_at: "2024-01-01T00:00:00Z",
    },
    status: "active",
  },
  {
    id: "3",
    full_name: "Ana Costa",
    phone: "(11) 77777-7777",
    email: "ana@email.com",
    funnel_status: "Proposta",
    notes: "Cliente interessado em cobertura",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T00:00:00Z",
    user_id: "1",
    property_title: "Cobertura duplex",
    property_address: "Rua Oscar Freire, 789 - Jardins",
    property_price: 2500000,
    assigned_user: {
      id: "1",
      name: "João Corretor",
      email: "joao@email.com",
      role: "corretor",
      created_at: "2024-01-01T00:00:00Z",
    },
    status: "won",
  },
  {
    id: "4",
    full_name: "Pedro Oliveira",
    phone: "(11) 66666-6666",
    email: "pedro@email.com",
    funnel_status: "Contato",
    notes: "Não teve interesse",
    created_at: "2024-01-12T10:00:00Z",
    updated_at: "2024-01-12T00:00:00Z",
    user_id: "1",
    property_title: "Apartamento 2 quartos",
    property_address: "Rua da Consolação, 456",
    property_price: 650000,
    assigned_user: {
      id: "1",
      name: "João Corretor",
      email: "joao@email.com",
      role: "corretor",
      created_at: "2024-01-01T00:00:00Z",
    },
    status: "lost",
  },
]

const mockProperties: Property[] = [
  {
    id: "1",
    title: "Apartamento 3 quartos Vila Madalena",
    description: "Lindo apartamento com varanda",
    address: "Rua Harmonia, 123 - Vila Madalena",
    price: 850000,
    type: "Apartamento",
    status: "Disponível",
    created_at: "2024-01-01T00:00:00Z",
    user_id: "1",
  },
]

const mockUsers: UserType[] = [
  {
    id: "1",
    name: "João Corretor",
    email: "joao@email.com",
    role: "corretor",
    created_at: "2024-01-01T00:00:00Z",
  },
]

// Opções de período pré-definido
const DATE_PRESETS = [
  { label: "Hoje", value: "today" },
  { label: "Esta semana", value: "this_week" },
  { label: "Este mês", value: "this_month" },
  { label: "Últimos 7 dias", value: "last_7_days" },
  { label: "Últimos 14 dias", value: "last_14_days" },
  { label: "Últimos 30 dias", value: "last_30_days" },
  { label: "Últimos 6 meses", value: "last_6_months" },
  { label: "Período personalizado", value: "custom" },
]

// Componente do Card Arrastável
interface DraggableClientCardProps {
  client: Client
  onClientClick: (clientId: string) => void
}

function DraggableClientCard({ client, onClientClick }: DraggableClientCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: client.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  }

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const cleanPhone = phone.replace(/\D/g, "")
    window.open(`https://wa.me/${cleanPhone}`, "_blank")
  }

  const openEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`mailto:${email}`, "_self")
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    return phone
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200 bg-white border border-gray-200",
        isDragging ? "shadow-xl rotate-1 scale-105" : "",
        client.status === "won" ? "border-green-500 bg-green-50" : "",
        client.status === "lost" ? "border-red-500 bg-red-50" : "",
      )}
      onClick={() => onClientClick(client.id)}
    >
      <CardContent className="p-4">
        {/* Header com nome e data */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 text-sm">{client.full_name}</h4>
            {client.status === "won" && <Badge className="bg-green-100 text-green-800 text-xs">Ganho</Badge>}
            {client.status === "lost" && <Badge className="bg-red-100 text-red-800 text-xs">Perdido</Badge>}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {new Date(client.updated_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
        </div>

        {/* Corretor responsável */}
        {client.assigned_user && (
          <div className="flex items-center mb-3">
            <User className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-xs text-gray-600">{client.assigned_user.name}</span>
          </div>
        )}

        {/* Telefone */}
        {client.phone && (
          <div className="flex items-center mb-2">
            <Phone className="h-3 w-3 text-gray-400 mr-2" />
            <span className="text-xs text-gray-700">{formatPhone(client.phone)}</span>
            <div className="flex gap-1 ml-auto">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-green-100"
                onClick={(e) => openWhatsApp(client.phone!, e)}
              >
                <MessageCircle className="h-3 w-3 text-green-600" />
              </Button>
            </div>
          </div>
        )}

        {/* Email */}
        {client.email && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center min-w-0 flex-1">
              <Mail className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-xs text-gray-700 truncate">{client.email}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-gray-100 ml-2"
              onClick={(e) => openEmail(client.email!, e)}
            >
              <Mail className="h-3 w-3 text-gray-600" />
            </Button>
          </div>
        )}

        {/* Imóvel de interesse */}
        {client.property_title && (
          <div className="mb-3">
            <div className="flex items-start">
              <Building className="h-3 w-3 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 mb-1">{client.property_title}</p>
                {client.property_address && (
                  <p className="text-xs text-gray-500 mb-1 line-clamp-2">{client.property_address}</p>
                )}
                {client.property_price && (
                  <p className="text-xs font-semibold text-green-600">
                    R$ {client.property_price.toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PipelinePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Estados para filtros - Status padrão definido como "em_andamento"
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("em_andamento")
  const [dateFilter, setDateFilter] = useState("")
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>()
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  const [assignedUserFilter, setAssignedUserFilter] = useState("")
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({
    full_name: "",
    phone: "",
    email: "",
    funnel_status: "Contato",
    notes: "",
    property_of_interest_id: "",
    user_id: user?.role === "corretor" ? user.id : "",
  })

  // Configuração dos sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setClients(mockClients)
      setProperties(mockProperties)
      setUsers(mockUsers)
      setLoading(false)
    }, 1000)
  }, [])

  // Hook para aplicar filtros quando eles mudarem
  useEffect(() => {
    // TODO: Implementar chamada à API com filtros
  }, [statusFilter, dateFilter, customDateRange, searchTerm, assignedUserFilter])

  // Função para calcular intervalo de datas baseado no preset
  const getDateRangeFromPreset = (preset: string): DateRange | undefined => {
    const today = new Date()

    switch (preset) {
      case "today":
        return { from: today, to: today }
      case "this_week":
        return { from: startOfWeek(today, { locale: ptBR }), to: endOfWeek(today, { locale: ptBR }) }
      case "this_month":
        return { from: startOfMonth(today), to: endOfMonth(today) }
      case "last_7_days":
        return { from: subDays(today, 7), to: today }
      case "last_14_days":
        return { from: subDays(today, 14), to: today }
      case "last_30_days":
        return { from: subDays(today, 30), to: today }
      case "last_6_months":
        return { from: subMonths(today, 6), to: today }
      default:
        return undefined
    }
  }

  const getFilteredClients = () => {
    let filtered = clients

    // Filtro por status da negociação
    if (statusFilter !== "todos") {
      filtered = filtered.filter((client) => {
        switch (statusFilter) {
          case "em_andamento":
            return !client.status || client.status === "active"
          case "ganho":
            return client.status === "won"
          case "perdido":
            return client.status === "lost"
          default:
            return true
        }
      })
    }

    // Filtro por data de criação
    if (dateFilter && dateFilter !== "custom") {
      const dateRange = getDateRangeFromPreset(dateFilter)
      if (dateRange?.from && dateRange?.to) {
        filtered = filtered.filter((client) => {
          const clientDate = new Date(client.created_at)
          return clientDate >= dateRange.from! && clientDate <= dateRange.to!
        })
      }
    } else if (customDateRange?.from && customDateRange?.to) {
      filtered = filtered.filter((client) => {
        const clientDate = new Date(client.created_at)
        return clientDate >= customDateRange.from! && clientDate <= customDateRange.to!
      })
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          (client.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.phone || "").includes(searchTerm) ||
          (client.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtro por usuário responsável
    if (assignedUserFilter && assignedUserFilter !== "__all__") {
      filtered = filtered.filter((client) => client.user_id === assignedUserFilter)
    }

    return filtered
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const clientId = active.id as string
    const newStatus = over.id as Client["funnel_status"]

    // Encontrar o cliente que está sendo movido
    const client = clients.find((c) => c.id === clientId)
    if (!client || client.funnel_status === newStatus) {
      setActiveId(null)
      return
    }

    // Atualizar o estado local imediatamente para feedback visual
    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? {
              ...client,
              funnel_status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : client,
      ),
    )

    setActiveId(null)

    // Aqui seria feita a chamada à API para persistir a mudança
    try {
      // await fetch(`/api/clients/${clientId}`, {
      //   method: 'PATCH',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     funnel_status: newStatus,
      //   }),
      // })

      console.log(`Cliente ${clientId} movido para ${newStatus}`)
    } catch (error) {
      console.error("Erro ao atualizar status do cliente:", error)
      // Reverter a mudança em caso de erro
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, funnel_status: client.funnel_status } : c)))
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()

    const client: Client = {
      id: Date.now().toString(),
      ...newClient,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "active",
    }

    setClients((prev) => [...prev, client])
    setNewClient({
      full_name: "",
      phone: "",
      email: "",
      funnel_status: "Contato",
      notes: "",
      property_of_interest_id: "",
      user_id: user?.role === "corretor" ? user.id : "",
    })
    setShowAddClient(false)
  }

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value)
    if (value === "custom") {
      setShowCustomDatePicker(true)
    } else {
      setCustomDateRange(undefined)
      setShowCustomDatePicker(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("em_andamento") // Volta para o padrão
    setDateFilter("")
    setCustomDateRange(undefined)
    setAssignedUserFilter("")
    setShowCustomDatePicker(false)
  }

  const hasActiveFilters =
    searchTerm || statusFilter !== "em_andamento" || dateFilter || customDateRange || assignedUserFilter

  const getClientsForStage = (stage: string) => {
    return getFilteredClients().filter((client) => client.funnel_status === stage)
  }

  const getStageConfig = (stage: string) => {
    const configs = {
      Contato: { bg: "bg-primary-custom", text: "text-white" },
      Diagnóstico: { bg: "bg-tertiary-custom", text: "text-white" },
      Agendado: { bg: "bg-secondary-custom", text: "text-white" },
      Visitado: { bg: "bg-orange-600", text: "text-white" },
      Proposta: { bg: "bg-purple-600", text: "text-white" },
      Contrato: { bg: "bg-green-600", text: "text-white" },
    }
    return configs[stage as keyof typeof configs] || { bg: "bg-gray-600", text: "text-white" }
  }

  const formatDateRange = () => {
    if (!customDateRange?.from) return ""
    if (!customDateRange.to) {
      return format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
    }
    return `${format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
            <p className="text-gray-600">Gerencie seus clientes através do funil de vendas</p>
          </div>

          <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
            <DialogTrigger asChild>
              <Button className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={newClient.full_name}
                    onChange={(e) => setNewClient((prev) => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="property">Imóvel de Interesse</Label>
                  <Select
                    value={newClient.property_of_interest_id || "__none__"}
                    onValueChange={(value) =>
                      setNewClient((prev) => ({ ...prev, property_of_interest_id: value === "__none__" ? "" : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={newClient.notes}
                    onChange={(e) => setNewClient((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione observações sobre o cliente..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddClient(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                    Adicionar Cliente
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro de Busca */}
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Filtro Status da Negociação */}
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Status da negociação</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="ganho">Ganho</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Data de Criação */}
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Data de criação</Label>
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Selecionar período" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Corretor Responsável */}
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Corretor responsável</Label>
              <Select value={assignedUserFilter} onValueChange={setAssignedUserFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os corretores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os corretores</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exibir período personalizado selecionado */}
          {customDateRange?.from && (
            <div className="mt-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Período: {formatDateRange()}</span>
            </div>
          )}
        </div>

        {/* Modal/Popover para Período Personalizado */}
        <Dialog open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Selecionar Período Personalizado</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <Calendar
                mode="range"
                selected={customDateRange}
                onSelect={setCustomDateRange}
                locale={ptBR}
                numberOfMonths={2}
                className="rounded-md border"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomDatePicker(false)
                    setDateFilter("")
                    setCustomDateRange(undefined)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => setShowCustomDatePicker(false)}
                  className="bg-secondary-custom hover:bg-secondary-custom/90 text-white"
                  disabled={!customDateRange?.from}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Kanban with Drag and Drop */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="h-full flex">
            {FUNNEL_STAGES.map((stage) => {
              const stageConfig = getStageConfig(stage)
              const stageClients = getClientsForStage(stage)

              return (
                <div key={stage} className="flex-1 flex flex-col min-w-0">
                  {/* Column Header */}
                  <div
                    className={cn(
                      "px-4 py-3 text-center border-r border-gray-200 last:border-r-0",
                      stageConfig.bg,
                      stageConfig.text,
                    )}
                    id={stage}
                  >
                    <h3 className="font-semibold text-sm">{stage}</h3>
                    <p className="text-xs opacity-90 mt-1">
                      {stageClients.length} cliente{stageClients.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Column Content with Scroll - Droppable Area */}
                  <div
                    className="flex-1 overflow-y-auto p-3 bg-white border-r border-gray-200 last:border-r-0 min-h-0"
                    style={{ maxHeight: "calc(100vh - 280px)" }}
                  >
                    <SortableContext items={stageClients.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {stageClients.map((client) => (
                          <DraggableClientCard
                            key={client.id}
                            client={client}
                            onClientClick={(clientId) => router.push(`/client/${clientId}`)}
                          />
                        ))}
                        {stageClients.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            Nenhum cliente neste estágio
                            <br />
                            <span className="text-xs">Arraste clientes para cá</span>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId ? (
              <div className="transform rotate-3 scale-105">
                <DraggableClientCard client={clients.find((c) => c.id === activeId)!} onClientClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
