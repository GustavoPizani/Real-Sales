// app/(app)/pipeline/page.tsx

"use client"

import React, { useEffect, useState, useCallback } from "react"
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
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
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
import { useAuth } from "@/contexts/auth-context" 
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

// Interfaces alinhadas com o schema.prisma
interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
}

interface Imovel {
  id: string;
  titulo: string;
  endereco: string | null;
  preco: number | null;
}

interface Cliente {
  id: string;
  nomeCompleto: string;
  email: string | null;
  telefone: string | null;
  currentFunnelStage: string;
  overallStatus: 'Ativo' | 'Ganho' | 'Perdido';
  createdAt: string;
  updatedAt: string;
  corretorId: string;
  corretor: Usuario | null;
  imovelDeInteresse: Imovel | null;
}

// Interface para as etapas do funil, baseada no schema.prisma
interface FunnelStage {
  id: string
  name: string
  order: number
  color: string
}

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
  client: Cliente
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
    window.open(`https://wa.me/55${cleanPhone}`, "_blank")
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
        isDragging && "shadow-xl rotate-1 scale-105",
        client.overallStatus === "Ganho" && "border-green-500 bg-green-50",
        client.overallStatus === "Perdido" && "border-red-500 bg-red-50",
      )}
      onClick={() => onClientClick(client.id)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 text-sm">{client.nomeCompleto}</h4>
            {client.overallStatus === "Ganho" && <Badge className="bg-green-100 text-green-800 text-xs">Ganho</Badge>}
            {client.overallStatus === "Perdido" && <Badge className="bg-red-100 text-red-800 text-xs">Perdido</Badge>}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {format(new Date(client.updatedAt), "dd/MM/yy")}
          </div>
        </div>

        {client.corretor && (
          <div className="flex items-center mb-3">
            <User className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-xs text-gray-600">{client.corretor.nome}</span>
          </div>
        )}

        {client.telefone && (
          <div className="flex items-center mb-2">
            <Phone className="h-3 w-3 text-gray-400 mr-2" />
            <span className="text-xs text-gray-700">{formatPhone(client.telefone)}</span>
            <div className="flex gap-1 ml-auto">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-green-100"
                onClick={(e) => openWhatsApp(client.telefone!, e)}
              >
                <MessageCircle className="h-3 w-3 text-green-600" />
              </Button>
            </div>
          </div>
        )}

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

        {client.imovelDeInteresse && (
          <div className="mb-3">
            <div className="flex items-start">
              <Building className="h-3 w-3 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 mb-1">{client.imovelDeInteresse.titulo}</p>
                {client.imovelDeInteresse.endereco && (
                  <p className="text-xs text-gray-500 mb-1 line-clamp-2">{client.imovelDeInteresse.endereco}</p>
                )}
                {client.imovelDeInteresse.preco && (
                  <p className="text-xs font-semibold text-green-600">
                    R$ {client.imovelDeInteresse.preco.toLocaleString("pt-BR")}
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
  const { toast } = useToast()
  const [clients, setClients] = useState<Cliente[]>([])
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([])
  const [properties, setProperties] = useState<Imovel[]>([])
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("em_andamento")
  const [dateFilter, setDateFilter] = useState("")
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>()
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [assignedUserFilter, setAssignedUserFilter] = useState("")

  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [newClient, setNewClient] = useState({
    full_name: "", // Corresponde a nomeCompleto
    phone: "",
    email: "",
    notes: "",
    property_of_interest_id: "",
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("authToken")
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter) params.append('status', statusFilter)
      if (assignedUserFilter) params.append('user_id', assignedUserFilter)
      
      const effectiveDateRange = dateFilter === 'custom' ? customDateRange : getDateRangeFromPreset(dateFilter);
      if (effectiveDateRange?.from) params.append('data_inicio', effectiveDateRange.from.toISOString())
      if (effectiveDateRange?.to) params.append('data_fim', effectiveDateRange.to.toISOString())

      const response = await fetch(`/api/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Falha ao carregar clientes.")
      const data = await response.json()
      setClients(data || [])
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os clientes." })
    } finally { setLoading(false) }
  }, [toast, searchTerm, statusFilter, assignedUserFilter, dateFilter, customDateRange])

  const fetchFunnelStages = useCallback(async () => {
    try {
      const response = await fetch("/api/funnel-stages")
      if (!response.ok) throw new Error("Falha ao carregar etapas do funil.")
      const data = await response.json()
      setFunnelStages(data)
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as etapas do funil." })
    }
  }, [toast])

  const fetchRelatedData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const [propertiesResponse, usersResponse] = await Promise.all([
        fetch('/api/properties', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (propertiesResponse.ok) {
        setProperties(await propertiesResponse.json());
      }
      if (usersResponse.ok) {
        setUsers(await usersResponse.json());
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar dados de apoio." })
    }
  }, [toast])

  useEffect(() => {
    if (user) {
      fetchRelatedData()
      fetchFunnelStages()
    }
  }, [user, fetchRelatedData, fetchFunnelStages])

  useEffect(() => {
    if (user) {
      fetchClients()
    }
  }, [user, fetchClients])

  const getDateRangeFromPreset = (preset: string): DateRange | undefined => {
    const today = new Date()
    switch (preset) {
      case "today": return { from: today, to: today }
      case "this_week": return { from: startOfWeek(today, { locale: ptBR }), to: endOfWeek(today, { locale: ptBR }) }
      case "this_month": return { from: startOfMonth(today), to: endOfMonth(today) }
      case "last_7_days": return { from: subDays(today, 7), to: today }
      case "last_14_days": return { from: subDays(today, 14), to: today }
      case "last_30_days": return { from: subDays(today, 30), to: today }
      case "last_6_months": return { from: subMonths(today, 6), to: today }
      default: return undefined
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const clientId = active.id as string;
    const newFunnelStage = over.id as string; // O ID da coluna é o nome da etapa
    const client = clients.find((c) => c.id === clientId);

    if (!client || client.currentFunnelStage === newFunnelStage) return;

    const oldFunnelStage = client.currentFunnelStage;

    // Atualização otimista na UI
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, currentFunnelStage: newFunnelStage, updatedAt: new Date().toISOString() } : c)),
    )

    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newFunnelStage }), // API espera 'status'
      })
      toast({ title: "Sucesso!", description: "Status do cliente atualizado." })
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o status." })
      // Reverte a mudança na UI em caso de erro
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, currentFunnelStage: oldFunnelStage } : c)))
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem("token")

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newClient, status: funnelStages[0]?.name || "Contato" }), // API espera 'status'
      })
      if (!response.ok) throw new Error("Falha ao criar cliente.")
      
      toast({ title: "Sucesso!", description: "Novo cliente adicionado ao pipeline." })
      setIsAddClientOpen(false)
      setNewClient({ full_name: "", phone: "", email: "", notes: "", property_of_interest_id: "" })
      fetchClients() // Recarrega a lista
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível criar o cliente." })
    }
  }

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value)
    setShowCustomDatePicker(value === "custom")
    if (value !== 'custom') {
        setCustomDateRange(undefined);
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("em_andamento")
    setDateFilter("")
    setCustomDateRange(undefined)
    setAssignedUserFilter("")
    setShowCustomDatePicker(false)
  }

  const hasActiveFilters =
    searchTerm || statusFilter !== "em_andamento" || dateFilter || customDateRange || assignedUserFilter

  const getClientsForStage = (stageName: string) => {
    return clients.filter(
      (client) => client.currentFunnelStage?.toLowerCase() === stageName.toLowerCase(),
    )
  }

  const formatDateRange = () => {
    if (!customDateRange?.from) return ""
    if (!customDateRange.to) return format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })
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
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
            <p className="text-gray-600">Gerencie seus clientes através do funil de vendas</p>
          </div>

          <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
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
              <form onSubmit={handleAddClient} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input id="full_name" value={newClient.full_name} onChange={(e) => setNewClient((p) => ({ ...p, full_name: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="property">Imóvel de Interesse</Label>
                  <Select value={newClient.property_of_interest_id || "__none__"} onValueChange={(value) => setNewClient((p) => ({ ...p, property_of_interest_id: value === "__none__" ? "" : value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione um imóvel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>{property.titulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" value={newClient.notes} onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))} placeholder="Adicione observações..." rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddClientOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">Adicionar Cliente</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700">
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Nome, email ou telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Status da negociação</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="ganho">Ganho</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                    <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Corretor responsável</Label>
              <Select value={assignedUserFilter} onValueChange={setAssignedUserFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos os corretores" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os corretores</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {customDateRange?.from && (
            <div className="mt-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Período: {formatDateRange()}</span>
            </div>
          )}
        </div>

        <Dialog open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Selecionar Período</DialogTitle></DialogHeader>
            <div className="p-4">
              <Calendar mode="range" selected={customDateRange} onSelect={setCustomDateRange} locale={ptBR} numberOfMonths={1} className="rounded-md border p-0"/>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { setShowCustomDatePicker(false); setDateFilter(""); setCustomDateRange(undefined); }}>Cancelar</Button>
                <Button onClick={() => setShowCustomDatePicker(false)} className="bg-secondary-custom hover:bg-secondary-custom/90 text-white" disabled={!customDateRange?.from}>Aplicar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-x-auto p-6 pt-0">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-6 gap-4 min-w-max h-full pt-6">
            {funnelStages.map((stage) => {
              const stageClients = getClientsForStage(stage.name)
              return (
                <div key={stage.id} id={stage.name} className="flex flex-col rounded-lg bg-gray-100 h-full">
                  <div
                    style={{ backgroundColor: stage.color }}
                    className={cn("px-4 py-2 text-center rounded-t-lg text-white")}
                  >
                    <h3 className="font-semibold text-sm">{stage.name}</h3>
                    <p className="text-xs opacity-90 mt-1">{stageClients.length} cliente{stageClients.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 bg-gray-200/50 rounded-b-lg space-y-3">
                    <SortableContext items={stageClients.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      {stageClients.map((client) => (
                        <DraggableClientCard key={client.id} client={client} onClientClick={(clientId) => router.push(`/clients/${clientId}`)} />
                      ))}
                      {stageClients.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm h-full flex flex-col justify-center items-center">
                          <p>Nenhum cliente aqui.</p>
                          <span className="text-xs">Arraste para mover</span>
                        </div>
                      )}
                    </SortableContext>
                  </div>
                </div>
              )
            })}
          </div>
          <DragOverlay>
            {activeId ? <DraggableClientCard client={clients.find((c) => c.id === activeId)!} onClientClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}