"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Filter, MapPin, Bed, Bath, Square } from "lucide-react"

interface Property {
  id: string
  title: string
  description: string
  price: number
  type: string
  status: string
  address: string
  bedrooms: number
  bathrooms: number
  area: number
  images: string[]
  typologies: any[]
  developer_name: string
  partnership_manager: string
  created_at: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/properties")
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error("Erro ao carregar propriedades:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.developer_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || property.status === statusFilter
    const matchesType = typeFilter === "all" || property.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    const statusMap = {
      available: { label: "Disponível", variant: "default" as const },
      sold: { label: "Vendido", variant: "secondary" as const },
      reserved: { label: "Reservado", variant: "outline" as const },
      construction: { label: "Em Construção", variant: "destructive" as const },
    }

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.available
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      apartamento: "Apartamento",
      casa: "Casa",
      cobertura: "Cobertura",
      terreno: "Terreno",
      comercial: "Comercial",
      empreendimento: "Empreendimento",
    }

    return typeMap[type as keyof typeof typeMap] || type
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Propriedades</h1>
            <p className="text-muted-foreground">Gerencie seu portfólio de imóveis</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Propriedades</h1>
          <p className="text-muted-foreground">Gerencie seu portfólio de imóveis</p>
        </div>

        <Link href="/properties/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Imóvel
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, endereço ou construtora..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                  <SelectItem value="construction">Em Construção</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="cobertura">Cobertura</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="empreendimento">Empreendimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Propriedades */}
      {filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma propriedade encontrada</h3>
              <p>Tente ajustar os filtros ou adicione uma nova propriedade.</p>
            </div>
            <Link href="/properties/new" className="mt-4 inline-block">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Propriedade
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0] || "/placeholder.svg"}
                    alt={property.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">Sem imagem</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">{getStatusBadge(property.status)}</div>
              </div>

              <CardContent className="p-4">
                <div className="mb-2">
                  <h3 className="font-semibold text-lg truncate">{property.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {getTypeBadge(property.type)}
                  </Badge>
                </div>

                {property.address && (
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span className="truncate">{property.address}</span>
                  </div>
                )}

                {property.developer_name && (
                  <div className="text-sm text-muted-foreground mb-3">
                    <strong>Construtora:</strong> {property.developer_name}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-3">
                    {property.bedrooms > 0 && (
                      <div className="flex items-center">
                        <Bed className="h-3 w-3 mr-1" />
                        {property.bedrooms}
                      </div>
                    )}
                    {property.bathrooms > 0 && (
                      <div className="flex items-center">
                        <Bath className="h-3 w-3 mr-1" />
                        {property.bathrooms}
                      </div>
                    )}
                    {property.area > 0 && (
                      <div className="flex items-center">
                        <Square className="h-3 w-3 mr-1" />
                        {property.area}m²
                      </div>
                    )}
                  </div>
                </div>

                {property.typologies && property.typologies.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-1">Tipologias:</div>
                    <div className="text-sm text-muted-foreground">
                      {property.typologies.map((typ: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{typ.name}</span>
                          <span>{formatPrice(typ.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Link href={`/properties/${property.id}`}>
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </Link>

                  <div className="text-sm text-muted-foreground">
                    {new Date(property.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estatísticas */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{properties.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {properties.filter((p) => p.status === "available").length}
              </div>
              <div className="text-sm text-muted-foreground">Disponíveis</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {properties.filter((p) => p.status === "reserved").length}
              </div>
              <div className="text-sm text-muted-foreground">Reservados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {properties.filter((p) => p.status === "sold").length}
              </div>
              <div className="text-sm text-muted-foreground">Vendidos</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
