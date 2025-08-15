"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, MapPin, Building, Home, Car, Bath, Bed, Square, Users, Phone, Mail, Edit } from "lucide-react"
import type { Property } from "@/lib/types"

// Mock data expandido para empreendimento
const mockProperty: Property = {
  id: "1",
  title: "Residencial Vila Harmonia",
  description:
    "Empreendimento moderno com excelente localização na Vila Madalena. Apartamentos de alto padrão com acabamento premium e área de lazer completa.",
  address: "Rua Harmonia, 123 - Vila Madalena, São Paulo - SP",
  type: "Empreendimento",
  status: "Disponível",
  features: [
    "Piscina",
    "Academia",
    "Salão de festas",
    "Playground",
    "Portaria 24h",
    "Elevador",
    "Garagem coberta",
    "Área gourmet",
    "Jardim",
    "Sauna",
  ],
  images: [
    "/placeholder.jpg?height=400&width=600&text=Fachada+do+Empreendimento",
    "/placeholder.jpg?height=400&width=600&text=Área+de+Lazer",
    "/placeholder.jpg?height=400&width=600&text=Apartamento+Decorado",
  ],
  typologies: [
    {
      id: "1",
      name: "Apartamento 2 quartos",
      price: 650000,
      area: 65,
      bedrooms: 2,
      bathrooms: 2,
      parking_spaces: 1,
      description: "Apartamento compacto e funcional, ideal para casais ou pequenas famílias",
      available_units: 12,
    },
    {
      id: "2",
      name: "Apartamento 3 quartos",
      price: 850000,
      area: 85,
      bedrooms: 3,
      bathrooms: 2,
      parking_spaces: 2,
      description: "Apartamento espaçoso com suíte master e varanda gourmet",
      available_units: 8,
    },
    {
      id: "3",
      name: "Cobertura duplex",
      price: 1200000,
      area: 120,
      bedrooms: 3,
      bathrooms: 3,
      parking_spaces: 2,
      description: "Cobertura duplex com terraço privativo e churrasqueira",
      available_units: 2,
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
}

export default function PropertyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    // Simular carregamento dos dados
    setTimeout(() => {
      setProperty(mockProperty)
      setLoading(false)
    }, 1000)
  }, [params.id])

  const getStatusColor = (status: string) => {
    const colors = {
      Disponível: "bg-green-100 text-green-800",
      Reservado: "bg-yellow-100 text-yellow-800",
      Vendido: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const handleEditProperty = () => {
    // Navegar para página de edição do imóvel
    router.push(`/properties/${params.id}/edit`)
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

  if (!property) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Imóvel não encontrado</h2>
          <p className="text-gray-600 mb-4">O imóvel que você está procurando não existe ou foi removido.</p>
          <Button onClick={() => router.push("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Imóveis
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
              <span className="text-sm text-gray-600">{property.type}</span>
            </div>
          </div>
        </div>

        <Button onClick={handleEditProperty}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Imóvel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galeria de Imagens */}
          <Card>
            <CardContent className="p-0">
              <div className="relative">
                <img
                  src={
                    property.images?.[selectedImage] || "/placeholder.jpg?height=400&width=800&text=Imagem+do+Imóvel"
                  }
                  alt={property.title}
                  className="w-full h-96 object-cover rounded-t-lg"
                />
                {property.images && property.images.length > 1 && (
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {property.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          selectedImage === index ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {property.images && property.images.length > 1 && (
                <div className="p-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {property.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedImage === index ? "border-primary" : "border-gray-200"
                        }`}
                      >
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`${property.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Descrição */}
          <Card>
            <CardHeader>
              <CardTitle>Sobre o Empreendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </CardContent>
          </Card>

          {/* Tipologias Disponíveis */}
          <Card>
            <CardHeader>
              <CardTitle>Tipologias Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipologia</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Quartos</TableHead>
                      <TableHead>Banheiros</TableHead>
                      <TableHead>Vagas</TableHead>
                      <TableHead>Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.typologies?.map((typology) => (
                      <TableRow key={typology.id}>
                        <TableCell>
                          <p className="font-medium">{typology.name}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Square className="h-4 w-4 text-gray-400" />
                            <span>{typology.area}m²</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4 text-gray-400" />
                            <span>{typology.bedrooms}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4 text-gray-400" />
                            <span>{typology.bathrooms}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4 text-gray-400" />
                            <span>{typology.parking_spaces}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{formatCurrency(typology.price)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Características */}
          {property.features && property.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Características do Empreendimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{property.address}</p>
            </CardContent>
          </Card>

          {/* Construtora */}
          {property.developer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Construtora
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-lg">{property.developer.name}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-600 mb-1">Gerente de Parcerias</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{property.developer.partnership_manager}</span>
                  </div>
                </div>

                {property.developer.phone && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Telefone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{property.developer.phone}</span>
                    </div>
                  </div>
                )}

                {property.developer.email && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">E-mail</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{property.developer.email}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <div className="flex items-center gap-2 mt-1">
                  <Home className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{property.type}</span>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-600">Total de Tipologias</p>
                <p className="text-2xl font-bold text-primary">{property.typologies?.length || 0}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-600">Faixa de Preços</p>
                {property.typologies && property.typologies.length > 0 && (
                  <div className="mt-1">
                    <p className="text-sm text-gray-700">
                      De {formatCurrency(Math.min(...property.typologies.map((t) => t.price)))}
                    </p>
                    <p className="text-sm text-gray-700">
                      Até {formatCurrency(Math.max(...property.typologies.map((t) => t.price)))}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-600">Cadastrado em</p>
                <p className="font-medium">{new Date(property.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
