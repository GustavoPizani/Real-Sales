"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapPin, Building, Home, Car, Bath, Bed, Square, Loader2, Send } from "lucide-react"
import type { Property } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function PublicPropertyViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [brokerId, setBrokerId] = useState<string | null>(null)

  // Lead form state
  const [leadName, setLeadName] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadMessage, setLeadMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const bId = searchParams.get('brokerId')
    if (bId) {
      setBrokerId(bId)
    }
  }, [searchParams])

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      // Use the new public API endpoint
      const response = await fetch(`/api/public/properties/${propertyId}`);
      if (!response.ok) {
        throw new Error("Imóvel não encontrado ou não está mais disponível.");
      }
      const data = await response.json();
      setProperty(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({
        variant: "destructive",
        title: "Erro ao carregar imóvel",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty])

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brokerId || !propertyId) {
      toast({
        variant: "destructive",
        title: "Erro de configuração",
        description: "Não foi possível identificar o corretor. O link pode estar inválido.",
      });
      return;
    }
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          message: leadMessage,
          propertyId,
          brokerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao enviar seu contato.");
      }

      toast({
        title: "Contato enviado com sucesso!",
        description: "O corretor responsável entrará em contato em breve.",
      });
      // Clear form
      setLeadName("")
      setLeadEmail("")
      setLeadPhone("")
      setLeadMessage("")

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({
        variant: "destructive",
        title: "Erro ao enviar contato",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions from the original component
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Carregando informações do imóvel...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Imóvel não encontrado</h2>
          <p className="text-gray-600 mb-4">O imóvel que você está procurando não existe ou foi removido.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="p-6 space-y-6 bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
                <span className="text-sm text-gray-600">{property.type}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <Card>
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={property.images?.[selectedImage] || "/placeholder.jpg?height=400&width=800&text=Imagem+do+Imóvel"}
                      alt={property.title}
                      className="w-full h-96 object-cover rounded-t-lg"
                    />
                    {property.images && property.images.length > 1 && (
                      <div className="absolute bottom-4 left-4 flex gap-2">
                        {property.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`w-3 h-3 rounded-full transition-colors ${selectedImage === index ? "bg-white" : "bg-white/50"}`}
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
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? "border-primary" : "border-gray-200"}`}
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

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Sobre o Empreendimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </CardContent>
              </Card>

              {/* Typologies */}
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
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {property.typologies?.map((typology) => (
                          <TableRow key={typology.id}>
                            <TableCell>
                              <p className="font-medium">{typology.name}</p>
                            </TableCell>
                            <TableCell>{typology.area}m²</TableCell>
                            <TableCell>{typology.bedrooms}</TableCell>
                            <TableCell>{typology.bathrooms}</TableCell>
                            <TableCell>{typology.parking_spaces}</TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium text-gray-800">Sob consulta</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
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
            <div className="space-y-6 sticky top-8">
              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Gostou do imóvel?</CardTitle>
                  <p className="text-sm text-muted-foreground">Fale com o corretor responsável.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" placeholder="Seu nome completo" required value={leadName} onChange={(e) => setLeadName(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" required value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" placeholder="(XX) XXXXX-XXXX" required value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="message">Mensagem (Opcional)</Label>
                      <Textarea id="message" placeholder="Tenho interesse neste imóvel..." value={leadMessage} onChange={(e) => setLeadMessage(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      {isSubmitting ? "Enviando..." : "Enviar Contato"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Location */}
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

              {/* Developer */}
              {property.developer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Construtora
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium text-lg">{property.developer.name}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}