"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, MapPin, Building, Home, Car, Bath, Bed, Square, Users, Phone, Mail, Pencil, Loader2, Share2, Copy, Camera, X } from "lucide-react"
import { type Imovel, type TipologiaImovel, type ImagemImovel, type Developer } from "@prisma/client";

// ✅ Interface ajustada para corresponder aos dados da API
interface Property extends Imovel {
  images: ImagemImovel[]; // 'imagens' foi renomeado para 'images' na API
  typologies: (TipologiaImovel & {
    plantas: any[];
  })[];
  // Campos que a API formata e envia:
  title: string;
  address: string;
  type: string;
  status: string;
  creatorName: string;
  updaterName: string;
  created_at: string;
  updated_at: string; // ✅ Adicionado para receber a data de atualização
}

import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"

export default function PropertyViewPage() {
  const params = useParams()
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  
  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Estados do Modal de Compartilhamento
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState("");

  // Estados da Galeria de Imagens
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      // O cookie de autenticação é enviado automaticamente pelo navegador.
      const response = await fetch(`/api/properties/${propertyId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error("Imóvel não encontrado ou falha ao carregar.");
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
      router.push("/properties");
    } finally {
      setLoading(false);
    }
  }, [propertyId, router, toast]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty])

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

  const handleShareClick = () => {
    if (user && propertyId) {
      const link = `${window.location.origin}/imovel/${propertyId}?brokerId=${user.id}`;
      setShareableLink(link);
      setIsShareModalOpen(true);
    }
  };

  const copyToClipboard = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink);
    toast({ title: "Sucesso!", description: "Link copiado!" });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>A carregar dados do imóvel...</p>
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
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleShareClick}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
            </Button>
            <Button onClick={() => router.push(`/properties/${property.id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Imóvel
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galeria de Imagens */}
          <Card>
            <CardContent className="p-0">
              <div 
                className="relative group cursor-pointer"
                onClick={() => property.images && property.images.length > 0 && setIsGalleryModalOpen(true)}
              >
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg">
                  <Camera className="h-12 w-12 text-white" />
                </div>
                <img
                  src={
                    (property.imagens && property.imagens.length > 0 ? property.imagens[selectedImage].url : null) || "/placeholder.jpg?height=400&width=800&text=Imagem+do+Imóvel"
                  }
                  alt={property.title}
                  className="w-full h-96 object-cover rounded-t-lg"
                />
                {property.images && property.images.length > 1 && ( // ✅ Corrigido de 'images' para 'imagens'
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {property.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation(); // Impede que o modal da galeria abra ao clicar nos botões
                          setSelectedImage(index);
                        }}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          selectedImage === index ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ✅ --- CARD DE DESCRIÇÃO SUBSTITUÍDO POR FEATURES --- ✅ */}
          {property.features && property.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Características do Empreendimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">{feature}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                      <TableHead>Unidades</TableHead>
                      <TableHead>Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.typologies && property.typologies.map((typology) => ( // ✅ Corrigido de 'tipologias' para 'typologies'
                      <TableRow key={typology.id}> 
                        <TableCell>
                          <div>
                            <p className="font-medium">{typology.nome || 'N/A'}</p>
                            {typology.description && ( // Mantido caso você use este campo
                              <p className="text-sm text-gray-600 mt-1">{typology.description}</p> 
                            )}
                          </div>
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
                            <span>{typology.dormitorios || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4 text-gray-400" />
                            <span>{typology.suites || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4 text-gray-400" />
                            <span>{typology.vagas || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* O campo available_units não está sendo enviado pela API, então foi removido por enquanto */}
                          <Badge variant="secondary">N/A</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{formatCurrency(typology.valor)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

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
              <p className="text-gray-700">{property.endereco || "Endereço não informado"}</p>
            </CardContent> 
          </Card> 

          {/* ✅ O card de Construtora foi removido pois o modelo `Developer` não está sendo usado/buscado */}

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

              {(property.updater || property.creator) && (
                <div>
                  <p className="text-sm text-gray-600">Última edição por</p>
                  <p className="font-medium">{property.updaterName || property.creatorName}</p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-gray-600">Atualizado em</p>
                <p className="font-medium">{new Date(property.updated_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Imóvel</DialogTitle>
            <DialogDescription>
              Copie o link abaixo e envie para o seu cliente. Ele verá uma página pública com os detalhes do imóvel e um formulário para entrar em contacto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input value={shareableLink} readOnly />
            <Button type="button" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setIsShareModalOpen(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal da Galeria de Imagens */}
      <Dialog open={isGalleryModalOpen} onOpenChange={setIsGalleryModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Galeria de Imagens</DialogTitle>
            <DialogDescription>
              Clique em uma imagem para ver em tela cheia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-1 flex-1">
            {property.images?.map((image, index) => ( // ✅ Corrigido de 'imagens' para 'images'
              <button
                key={index}
                className="relative aspect-square w-full h-auto rounded-md overflow-hidden group focus:ring-2 focus:ring-primary focus:ring-offset-2 outline-none"
                onClick={() => {
                  setFullScreenImage(image.url);
                  setIsGalleryModalOpen(false);
                }}
              >
                <img
                  src={image.url || "/placeholder.svg"}
                  alt={`${property.title} ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Visualização de Imagem em Tela Cheia */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setFullScreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-opacity"
            onClick={() => setFullScreenImage(null)}
          >
            <X className="h-8 w-8" />
            <span className="sr-only">Fechar</span>
          </button>
          <img
            src={fullScreenImage}
            alt="Visualização em tela cheia"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()} // Impede que o clique na imagem feche o modal
          />
        </div>
      )}
    </div>
  )
}