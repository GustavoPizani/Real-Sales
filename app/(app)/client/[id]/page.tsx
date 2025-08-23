"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import {
  Phone,
  Mail,
  MapPin,
  Edit,
  UserPlus,
  Building,
  DollarSign,
  FileText,
  CheckSquare,
  Clock,
  AlertCircle,
} from "lucide-react"

interface Note {
  id: string
  content: string
  createdAt: string
  createdBy: string
}

interface Client {
  id: string
  nomeCompleto: string
  email: string | null
  telefone: string | null
  budget: number | null
  preferences: string | null
  currentFunnelStage: string
  corretorId: string
  corretor: StaffUser
  imovelDeInteresseId: string | null
  createdAt: string
  notas: Note[]
}

interface Task {
  id: string
  title: string
  descricao: string | null
  dataHora: string
  concluida: boolean
  // priority: string; // Campo não existe no schema
}

interface Property {
  id: string
  titulo: string
  tipo: string | null
  preco: number | null
  endereco: string | null
  quartos: number | null
  banheiros: number | null
  area: number | null
  descricao: string | null
}

interface StaffUser {
  id: string
  name: string
  role: string
}

export default function ClientDetail() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [interestedProperty, setInterestedProperty] = useState<Property | null>(null)
  const [clientTasks, setClientTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Modal states
  const [isEditClientOpen, setIsEditClientOpen] = useState(false)
  const [isEditPropertyOpen, setIsEditPropertyOpen] = useState(false)
  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false)
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)

  // Form states
  const [editClientData, setEditClientData] = useState({
    name: "",
    email: "",
    phone: "", // Corresponde a 'telefone'
    budget: "", // Corresponde a 'budget' (Float)
    preferences: "",
    status: "", // Corresponde a 'currentFunnelStage'
  })

  const [editPropertyData, setEditPropertyData] = useState({
    title: "",
    type: "",
    price: "",
    location: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    description: "",
  })

  const [assignData, setAssignData] = useState({
    assigned_to: "", // corretorId
    manager_id: "", // Não é editável diretamente aqui
    director_id: "", // Não é editável diretamente aqui
  })

  const [newNote, setNewNote] = useState("")

  useEffect(() => {
    if (params.id) {
      fetchClientData()
    }
  }, [params.id]) // Removido fetchUsers daqui para evitar chamadas desnecessárias

  const fetchClientData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${params.id}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError("Cliente não encontrado")
        } else {
          setError("Erro ao carregar dados do cliente")
        }
        return
      }

      const data = await response.json()
      console.log("Client data from API:", data)
      setClient(data.client)
      setInterestedProperty(data.interestedProperty)
      setClientTasks(data.clientTasks || [])
      fetchUsers() // Fetch users after we know we need them

      // Set edit form data
      setEditClientData({
        name: data.client.nomeCompleto || "",
        email: data.client.email || "",
        phone: data.client.telefone || "",
        budget: data.client.budget?.toString() || "",
        preferences: data.client.preferences || "",
        status: data.client.currentFunnelStage || "",
      })

      setAssignData({
        assigned_to: data.client.corretorId || "",
        manager_id: data.client.corretor?.superior?.id?.toString() || "",
        director_id: "", // Lógica de diretor precisa ser definida
      })

    } catch (error) {
      console.error("Error fetching client:", error)
      setError("Erro ao carregar dados do cliente")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data || []) // API de usuários parece retornar um array diretamente
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleEditClient = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: "PUT", // ou PATCH
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editClientData),
      })

      if (response.ok) {
        setIsEditClientOpen(false)
        fetchClientData()
      }
    } catch (error) {
      console.error("Error updating client:", error)
    }
  }

  const handleEditProperty = async () => {
    if (!interestedProperty) return

    try {
      const response = await fetch(`/api/properties/${interestedProperty.id}`, {
        method: "PUT", // ou PATCH
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editPropertyData,
          preco: Number.parseFloat(editPropertyData.price),
          quartos: Number.parseInt(editPropertyData.bedrooms),
          banheiros: Number.parseInt(editPropertyData.bathrooms),
          area: Number.parseFloat(editPropertyData.area),
        }),
      })

      if (response.ok) {
        setIsEditPropertyOpen(false)
        fetchInterestedProperty(interestedProperty.id)
      }
    } catch (error) {
      console.error("Error updating property:", error)
    }
  }

  const handleAssignClient = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: "PUT", // ou PATCH
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigned_to: assignData.assigned_to,
        }),
      })

      if (response.ok) {
        setIsAssignClientOpen(false)
        fetchClientData()
      }
    } catch (error) {
      console.error("Error assigning client:", error)
    }
  }

  const handleAddNote = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newNote,
          createdBy: user?.name || "Sistema",
        }),
      })

      if (response.ok) {
        setIsAddNoteOpen(false)
        setNewNote("")
        fetchClientData()
      }
    } catch (error) {
      console.error("Error adding note:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      lead: { color: "bg-blue-100 text-blue-800", label: "Lead" },
      cliente: { color: "bg-green-100 text-green-800", label: "Cliente" },
      inativo: { color: "bg-gray-100 text-gray-800", label: "Inativo" },
      visitado: { color: "bg-orange-100 text-orange-800", label: "Visitado" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    }

    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getPriorityIcon = (priority: string) => {
    // A lógica de prioridade não está no schema de Tarefa.
    // Este é um exemplo de como poderia ser, mas o schema precisa ser atualizado.
    if (priority === "high") return <AlertCircle className="h-4 w-4 text-red-500" />
    if (priority === "medium") return <Clock className="h-4 w-4 text-yellow-500" />
    return <CheckSquare className="h-4 w-4 text-green-500" />
  }

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return "Não atribuído"
    // A interface StaffUser foi corrigida para ter id como string
    const foundUser = users.find((u) => u.id === userId)
    return foundUser?.name || "Não atribuído"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-custom"></div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{error || "Cliente não encontrado"}</h1>
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-custom">{client.nomeCompleto}</h1>
          <p className="text-gray-600 mt-2">Detalhes do cliente</p>
        </div>
        <Button onClick={() => router.push("/dashboard")} variant="outline">
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-primary-custom">Informações do Cliente</CardTitle>
                <CardDescription>Dados pessoais e de contato</CardDescription>
              </div>
              <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>Atualize as informações do cliente.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">
                        Nome
                      </Label>
                      <Input
                        id="edit-name"
                        value={editClientData.name}
                        onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editClientData.email}
                        onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-phone" className="text-right">
                        Telefone
                      </Label>
                      <Input
                        id="edit-phone"
                        value={editClientData.phone}
                        onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-budget" className="text-right">
                        Orçamento
                      </Label>
                      <Input
                        id="edit-budget"
                        value={editClientData.budget}
                        onChange={(e) => setEditClientData({ ...editClientData, budget: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-status" className="text-right">
                        Status
                      </Label>
                      <Select
                        value={editClientData.status}
                        onValueChange={(value) => setEditClientData({ ...editClientData, status: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="visitado">Visitado</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-preferences" className="text-right">
                        Preferências
                      </Label>
                      <Textarea
                        id="edit-preferences"
                        value={editClientData.preferences}
                        onChange={(e) => setEditClientData({ ...editClientData, preferences: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleEditClient}>Salvar Alterações</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="font-medium">{client.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{client.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium">{client.telefone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Orçamento</p>
                    <p className="font-medium">{client.budget ? `R$ ${client.budget.toLocaleString("pt-BR")}` : "N/A"}</p>
                  </div>
                </div>
              </div>
              {client.preferences && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Preferências</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{client.preferences || "N/A"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interested Property */}
          {interestedProperty && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-primary-custom">Imóvel de Interesse</CardTitle>
                  <CardDescription>Propriedade que o cliente demonstrou interesse</CardDescription>
                </div>
                <Dialog open={isEditPropertyOpen} onOpenChange={setIsEditPropertyOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Imóvel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Editar Imóvel</DialogTitle>
                      <DialogDescription>Atualize as informações do imóvel.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-title" className="text-right">
                          Título
                        </Label>
                        <Input
                          id="edit-property-title"
                          value={editPropertyData.title || ""}
                          onChange={(e) => setEditPropertyData({ ...editPropertyData, title: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-type" className="text-right">
                          Tipo
                        </Label>
                        <Select
                          value={editPropertyData.type}
                          onValueChange={(value) => setEditPropertyData({ ...editPropertyData, type: value })}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartamento">Apartamento</SelectItem>
                            <SelectItem value="casa">Casa</SelectItem>
                            <SelectItem value="terreno">Terreno</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-price" className="text-right">
                          Preço
                        </Label>
                        <Input
                          id="edit-property-price"
                          type="number"
                          value={editPropertyData.price || ""}
                          onChange={(e) => setEditPropertyData({ ...editPropertyData, price: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-location" className="text-right">
                          Localização
                        </Label>
                        <Input
                          id="edit-property-location"
                          value={editPropertyData.location || ""}
                          onChange={(e) => setEditPropertyData({ ...editPropertyData, location: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-bedrooms" className="text-right">
                          Quartos
                        </Label>
                        <Input
                          id="edit-property-bedrooms"
                          type="number"
                          value={editPropertyData.bedrooms || ""}
                          onChange={(e) => setEditPropertyData({ ...editPropertyData, bedrooms: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-bathrooms" className="text-right">
                          Banheiros
                        </Label>
                        <Input
                          id="edit-property-bathrooms"
                          type="number"
                          value={editPropertyData.bathrooms || ""}
                          onChange={(e) => setEditPropertyData({ ...editPropertyData, bathrooms: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-area" className="text-right">
                          Área (m²)
                        </Label>
                        <Input
                          id="edit-property-area"
                          type="number"
                          value={editPropertyData.area || ""}
                          onChange={(e) => setEditPropertyData({ ...editPropertyData, area: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-property-description" className="text-right">
                          Descrição
                        </Label>
                        <Textarea
                          id="edit-property-description"
                          value={editPropertyData.description || ""}
                          onChange={(e) => setEditPropertyData({ ...editPropertyData, description: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleEditProperty}>Salvar Alterações</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{interestedProperty.titulo}</h3>
                    <Badge className="bg-secondary-custom text-white">
                      R$ {interestedProperty.preco?.toLocaleString("pt-BR")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Tipo</p>
                      <p className="font-medium capitalize">{interestedProperty.tipo}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quartos</p>
                      <p className="font-medium">{interestedProperty.quartos}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Banheiros</p>
                      <p className="font-medium">{interestedProperty.banheiros}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Área</p>
                      <p className="font-medium">{interestedProperty.area}m²</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{interestedProperty.endereco}</p>
                  </div>
                  {interestedProperty.description && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Descrição</p>
                      <p className="text-sm bg-gray-50 p-3 rounded-lg">{interestedProperty.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary-custom">Tarefas Relacionadas</CardTitle>
              <CardDescription>Tarefas associadas a este cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getPriorityIcon(task.concluida ? 'low' : 'medium')}
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-gray-500">{task.descricao}</p>
                        <p className="text-xs text-gray-400">
                          Vencimento: {new Date(task.dataHora).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(task.concluida ? 'concluída' : 'pendente')}
                  </div>
                ))}
                {clientTasks.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhuma tarefa encontrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary and Actions */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-primary-custom">Resumo</CardTitle>
              <Dialog open={isAssignClientOpen} onOpenChange={setIsAssignClientOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Atribuir Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Atribuir Cliente</DialogTitle>
                    <DialogDescription>Defina os responsáveis pelo cliente.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assign-corretor" className="text-right">
                        Corretor
                      </Label>
                      <Select
                        value={assignData.assigned_to}
                        onValueChange={(value) => setAssignData({ ...assignData, assigned_to: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o corretor" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === "corretor")
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assign-manager" className="text-right">
                        Gerente
                      </Label>
                      <Select
                        value={assignData.manager_id}
                        onValueChange={(value) => setAssignData({ ...assignData, manager_id: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o gerente" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === "gerente")
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assign-director" className="text-right">
                        Diretor
                      </Label>
                      <Select
                        value={assignData.director_id}
                        onValueChange={(value) => setAssignData({ ...assignData, director_id: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o diretor" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === "diretor")
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAssignClient}>Atribuir</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Status Atual</p>
                {getStatusBadge(client.currentFunnelStage)}
              </div>

              <div>
                <p className="text-sm text-gray-500">Corretor Responsável</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Building className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">{client.corretor?.nome || "Não atribuído"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Gerente Responsável</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Building className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">{client.corretor?.superior?.nome || "Não atribuído"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Diretor Responsável</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Building className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">
                    {"Não implementado"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Anotações</p>
                <p className="text-2xl font-bold text-primary-custom">{client.notas?.length || 0}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Tarefas Pendentes</p>
                <p className="text-2xl font-bold text-secondary-custom">
                  {clientTasks.filter((task) => !task.concluida).length}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Cliente desde</p>
                <p className="font-medium">{new Date(client.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-primary-custom">Anotações</CardTitle>
              <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Nova Anotação</DialogTitle>
                    <DialogDescription>Adicione uma nova anotação sobre o cliente.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="note-content" className="text-right">
                        Conteúdo
                      </Label>
                      <Textarea
                        id="note-content"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="col-span-3"
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddNote}>Adicionar Anotação</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.notas?.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{note.content}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{note.createdBy}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
                {(!client.notas || client.notas.length === 0) && (
                  <p className="text-gray-500 text-center py-4">Nenhuma anotação encontrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
