"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Filter, Eye, Edit, Building, MapPin, DollarSign, Home } from "lucide-react"
import type { Property } from "@/lib/types"

// Mock data
const mockProperties: Property[] = [
  {
    id: "1",
    title: "Residencial Vila Harmonia",
    description: "Empreendimento moderno com excelente localização na Vila Madalena.",
    address: "Rua Harmonia, 123 - Vila Madalena, São Paulo - SP",
    type: "Empreendimento",
    status: "Disponível",
    features: ["Piscina", "Academia", "Salão de festas", "Playground", "Portaria 24h"],
    images: ["/placeholder.jpg?height=400&width=600&text=Fachada+do+Empreendimento"],
    typologies: [
      {
        id: "1",
        name: "Apartamento 2 quartos",
        price: 650000,
        area: 65,
        bedrooms: 2,
        bathrooms: 2,
        parking_spaces: 1,
      },
      {
        id: "2",
        name: "Apartamento 3 quartos",
        price: 850000,
        area: 85,
        bedrooms: 3,
        bathrooms: 2,
        parking_spaces: 2,
      },
    ],
    developer: {
      name: "Construtora Harmonia Ltda",
      partnership_manager: "Carlos Silva",
      phone: "(11) 3333-4444",
      email: "parcerias@harmoniaconstrutora.com.br",
    },
    created_at: "2024-01-01T00:00:00Z",
    user_id: "1",
  },
  {
    id: "2",
    title: "Edifício Sunset Boulevard",
    description: "Apartamentos de luxo com vista para o mar em Copacabana.",
    address: "Av. Atlântica, 456 - Copacabana, Rio de Janeiro - RJ",
    type: "Empreendimento",
    status: "Disponível",
    features: ["Vista para o mar", "Piscina infinity", "Spa", "Concierge"],
    images: ["/placeholder.jpg?height=400&width=600&text=Vista+do+Mar"],
    typologies: [
      {
        id: "3",
        name: "Studio",
        price: 450000,
        area: 35,
        bedrooms: 0,
        bathrooms: 1,
        parking_spaces: 1,
      },
      {
        id: "4",
        name: "Apartamento 1 quarto",
        price: 750000,
        area: 55,
        bedrooms: 1,
        bathrooms: 1,
        parking_spaces: 1,
      },
    ],
    developer: {
      name: "Construtora Oceano Azul",
      partnership_manager: "Marina Santos",
      phone: "(21) 2222-3333",
      email: "parcerias@oceanoazul.com.br",
    },
    created_at: "2024-01-15T00:00:00Z",
    user_id: "2",
  },
]

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    // Simular carregamento dos dados
    setTimeout(() => {
      setProperties(mockProperties)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.developer?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || property.status === statusFilter
    const matchesType = typeFilter === "all" || property.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      Disponível: "default",
      Reservado: "secondary",
      Vendido: "destructive",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status}</Badge>
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getPriceRange = (typologies: any[]) => {
    if (!typologies || typologies.length === 0) return "Não informado"

    const prices = typologies.map((t) => t.price).filter((p) => p > 0)
    if (prices.length === 0) return "Não informado"

    const min = Math.min(...prices)
    const max = Math.max(...prices)

    if (min === max) return formatCurrency(min)
    return `${formatCurrency(min)} - ${formatCurrency(max)}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Imóveis</h1>
          <p className="text-gray-600">Gerencie todos os empreendimentos e propriedades</p>
        </div>

        <Button onClick={() => router.push("/properties/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Imóvel
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, endereço ou construtora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Disponível">Disponível</SelectItem>
                <SelectItem value="Reservado">Reservado</SelectItem>
                <SelectItem value="Vendido">Vendido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Empreendimento">Empreendimento</SelectItem>
                <SelectItem value="Apartamento">Apartamento</SelectItem>
                <SelectItem value="Casa">Casa</SelectItem>
                <SelectItem value="Comercial">Comercial</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-gray-600">
              {filteredProperties.length} de {properties.length} imóveis
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Imóveis */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Imóveis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Construtora</TableHead>
                <TableHead>Tipologias</TableHead>
                <TableHead>Faixa de Preços</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow key={property.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{property.title}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.address}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Home className="h-3 w-3" />
                      {property.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(property.status)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{property.developer?.name}</p>
                      <p className="text-sm text-gray-600">{property.developer?.partnership_manager}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-gray-400" />
                      {property.typologies?.length || 0} tipologias
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      {getPriceRange(property.typologies || [])}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/properties/${property.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/properties/${property.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredProperties.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum imóvel encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou adicione um novo imóvel</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
