"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, MapPin, Home, Car, Bath, Bed, Square, Pencil, Loader2, Share2, Copy, Camera, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { PropertyStatus } from "@/lib/types"

interface Typology {
  id: string
  name: string
  value: number
  area?: number | null
  dormitorios?: number | null
  suites?: number | null
  vagas?: number | null
  floorPlanUrl?: string | null
}

interface PropertyDetail {
  id: string
  title: string
  address?: string | null
  type?: string | null
  status: PropertyStatus
  features?: string[]
  images: { id: string; url: string }[]
  typologies: Typology[]
  creatorName?: string
  updaterName?: string
  createdAt: string
  updatedAt: string
}

const STATUS_LABEL: Record<string, string> = {
  LANCAMENTO: "Lançamento",
  EM_OBRAS: "Em Obras",
  PRONTO: "Pronto",
}

const STATUS_CLASS: Record<string, string> = {
  LANCAMENTO: "bg-blue-100 text-blue-800",
  EM_OBRAS: "bg-yellow-100 text-yellow-800",
  PRONTO: "bg-green-100 text-green-800",
}

export default function PropertyViewPage() {
  const params = useParams()
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id

  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareableLink, setShareableLink] = useState("")
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [fullScreenIndex, setFullScreenIndex] = useState(0)

  // Imagens unificadas: fotos + plantas das tipologias
  const allImages = property
    ? [
        ...property.images.map(img => ({ url: img.url, label: property.title })),
        ...property.typologies
          .filter(t => t.floorPlanUrl)
          .map(t => ({ url: t.floorPlanUrl!, label: `Planta — ${t.name}` })),
      ]
    : []

  const openFullScreen = (index: number) => {
    setFullScreenIndex(index)
    setFullScreenImage(allImages[index]?.url ?? null)
    setIsGalleryModalOpen(false)
  }

  const prevFullScreen = () => {
    const newIdx = (fullScreenIndex - 1 + allImages.length) % allImages.length
    setFullScreenIndex(newIdx)
    setFullScreenImage(allImages[newIdx].url)
  }

  const nextFullScreen = () => {
    const newIdx = (fullScreenIndex + 1) % allImages.length
    setFullScreenIndex(newIdx)
    setFullScreenImage(allImages[newIdx].url)
  }

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}/details`)
      if (!response.ok) throw new Error("Imóvel não encontrado ou falha ao carregar.")
      const data = await response.json()
      setProperty(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido."
      toast({ variant: "destructive", title: "Erro ao carregar imóvel", description: errorMessage })
      router.push("/properties")
    } finally {
      setLoading(false)
    }
  }, [propertyId, router, toast])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

  const handleShareClick = () => {
    if (user && propertyId) {
      const link = `${window.location.origin}/imovel/${propertyId}?brokerId=${user.id}`
      setShareableLink(link)
      setIsShareModalOpen(true)
    }
  }

  const copyToClipboard = () => {
    if (!shareableLink) return
    navigator.clipboard.writeText(shareableLink)
    toast({ title: "Sucesso!", description: "Link copiado!" })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Imóvel não encontrado</h2>
          <p className="text-muted-foreground mb-4">O imóvel que você está procurando não existe ou foi removido.</p>
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
            <h1 className="text-3xl font-bold text-white">{property.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={STATUS_CLASS[property.status] ?? "bg-muted text-muted-foreground"}>
                {STATUS_LABEL[property.status] ?? property.status}
              </Badge>
              {property.type && <span className="text-sm text-muted-foreground">{property.type}</span>}
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
          {/* Galeria */}
          <Card>
            <CardContent className="p-0">
              <div
                className="relative group cursor-pointer"
                onClick={() => property.images.length > 0 && setIsGalleryModalOpen(true)}
              >
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg">
                  <Camera className="h-12 w-12 text-white" />
                </div>
                <img
                  src={property.images[selectedImage]?.url || "/placeholder.jpg"}
                  alt={property.title}
                  className="w-full h-96 object-cover rounded-t-lg"
                />
                {property.images.length > 1 && (
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {property.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => { e.stopPropagation(); setSelectedImage(index) }}
                        className={`w-3 h-3 rounded-full transition-colors ${selectedImage === index ? "bg-white" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                )}
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
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">{feature}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tipologias */}
          <Card>
            <CardHeader>
              <CardTitle>Tipologias Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Planta</TableHead>
                      <TableHead>Tipologia</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Quartos</TableHead>
                      <TableHead>Suítes</TableHead>
                      <TableHead>Vagas</TableHead>
                      <TableHead>Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.typologies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma tipologia cadastrada.</TableCell>
                      </TableRow>
                    )}
                    {property.typologies.map((typology) => (
                      <TableRow key={typology.id}>
                        <TableCell>
                          {typology.floorPlanUrl ? (
                            <button
                              onClick={() => {
                                const idx = allImages.findIndex(img => img.url === typology.floorPlanUrl)
                                if (idx >= 0) openFullScreen(idx)
                              }}
                              className="block"
                            >
                              <img
                                src={typology.floorPlanUrl}
                                alt={`Planta ${typology.name}`}
                                className="h-16 w-24 object-cover rounded-md border border-border hover:opacity-75 hover:scale-105 transition-all"
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{typology.name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Square className="h-4 w-4 text-muted-foreground/70" />
                            <span>{typology.area != null ? `${typology.area}m²` : "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4 text-muted-foreground/70" />
                            <span>{typology.dormitorios ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4 text-muted-foreground/70" />
                            <span>{typology.suites ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4 text-muted-foreground/70" />
                            <span>{typology.vagas ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{formatCurrency(typology.value)}</span>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80">{property.address || "Endereço não informado"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={STATUS_CLASS[property.status] ?? "bg-muted text-muted-foreground"}>
                  {STATUS_LABEL[property.status] ?? property.status}
                </Badge>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <div className="flex items-center gap-2 mt-1">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{property.type || "Não informado"}</span>
                </div>
              </div>

              <Separator />

              {(property.updaterName || property.creatorName) && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Última edição por</p>
                    <p className="font-medium">{property.updaterName || property.creatorName}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Data de atualização</p>
                <p className="font-medium">{new Date(property.updatedAt).toLocaleDateString("pt-BR")}</p>
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
              Copie o link abaixo e envie para o seu cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input value={shareableLink} readOnly />
            <Button type="button" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsShareModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal da Galeria — fotos + plantas */}
      <Dialog open={isGalleryModalOpen} onOpenChange={setIsGalleryModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Galeria de Imagens</DialogTitle>
            <DialogDescription>
              {property.images.length} foto{property.images.length !== 1 ? 's' : ''}
              {allImages.length > property.images.length && ` · ${allImages.length - property.images.length} planta${allImages.length - property.images.length !== 1 ? 's' : ''}`}
              {' '}— clique para ampliar
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto p-1 flex-1">
            {allImages.map((img, index) => {
              const isFloorPlan = index >= property.images.length
              return (
                <button
                  key={index}
                  className="relative aspect-square w-full rounded-md overflow-hidden group focus:ring-2 focus:ring-primary outline-none"
                  onClick={() => openFullScreen(index)}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {isFloorPlan && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-white text-[10px] font-semibold truncate">{img.label}</p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen com navegação */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setFullScreenImage(null)}
        >
          {/* Fechar */}
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white z-10"
            onClick={() => setFullScreenImage(null)}
          >
            <X className="h-7 w-7" />
          </button>

          {/* Contador + label */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm text-center">
            <span>{fullScreenIndex + 1} / {allImages.length}</span>
            {fullScreenIndex >= property.images.length && (
              <p className="text-white/40 text-xs mt-0.5">{allImages[fullScreenIndex]?.label}</p>
            )}
          </div>

          {/* Prev */}
          {allImages.length > 1 && (
            <button
              className="absolute left-4 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 z-10"
              onClick={(e) => { e.stopPropagation(); prevFullScreen() }}
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}

          {/* Imagem */}
          <img
            src={fullScreenImage}
            alt={allImages[fullScreenIndex]?.label}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {allImages.length > 1 && (
            <button
              className="absolute right-4 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 z-10"
              onClick={(e) => { e.stopPropagation(); nextFullScreen() }}
            >
              <ArrowLeft className="h-6 w-6 rotate-180" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
