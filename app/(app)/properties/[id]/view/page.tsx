"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft, Bath, BedDouble, Building, Car, ChevronLeft, ChevronRight, Copy, ExternalLink, Layers, Loader2,
  MapPin, MessageCircle, Pencil, Ruler, Share2, Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { DASH_CARD, DASH_HERO, DASH_PANEL } from "@/components/dashboard/ui"

interface Roleta {
  id: string
  name: string
}

interface FunnelOption {
  id: string
  name: string
  isDefaultEntry?: boolean
}

// Sem funil escolhido no link: o lead entra no funil da roleta ou no de entrada padrão.
const DEFAULT_FUNNEL = "default"

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
  status: string
  features?: string[]
  images: { id: string; url: string }[]
  typologies: Typology[]
  interestedClientsCount?: number
  creatorName?: string
  updaterName?: string
  createdAt: string
  updatedAt: string
}

// Cada status tem rótulo e um ponto de cor: a cor nunca é o único sinal.
const STATUS: Record<string, { label: string; dot: string }> = {
  LANCAMENTO: { label: "Lançamento", dot: "bg-[var(--accent-primary)]" },
  EM_OBRAS: { label: "Em obras", dot: "bg-amber-500" },
  PRONTO: { label: "Pronto", dot: "bg-emerald-500" },
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)

/** "2 a 3" quando os valores variam, "2" quando são iguais, null quando não há dado. */
function rangeOf(values: (number | null | undefined)[]): string | null {
  const known = values.filter((v): v is number => typeof v === "number" && v > 0)
  if (known.length === 0) return null
  const min = Math.min(...known)
  const max = Math.max(...known)
  const format = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
  return min === max ? format(min) : `${format(min)} a ${format(max)}`
}

function Spec({ icon: Icon, label, value }: { icon: typeof BedDouble; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="font-medium text-foreground">{value}</span> {label}
    </span>
  )
}

export default function PropertyViewPage() {
  const params = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  // null = fechado; número = índice da imagem aberta em tela cheia.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id

  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareableLink, setShareableLink] = useState("")
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [shareMode, setShareMode] = useState<"direct" | "roleta">("direct")
  const [roletas, setRoletas] = useState<Roleta[]>([])
  const [selectedRoletaId, setSelectedRoletaId] = useState("")
  const [funnels, setFunnels] = useState<FunnelOption[]>([])
  const [selectedFunnelId, setSelectedFunnelId] = useState(DEFAULT_FUNNEL)
  const isAdmin = user?.role === "MARKETING_ADMIN"

  // Galeria única: fotos primeiro, depois as plantas das tipologias.
  const gallery = useMemo(
    () =>
      property
        ? [
            ...property.images.map(img => ({ url: img.url, label: property.title, isFloorPlan: false })),
            ...property.typologies
              .filter(t => t.floorPlanUrl)
              .map(t => ({ url: t.floorPlanUrl as string, label: `Planta: ${t.name}`, isFloorPlan: true })),
          ]
        : [],
    [property],
  )

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}/details`)
      if (!response.ok) throw new Error()
      setProperty(await response.json())
    } catch {
      // Sem redirecionar: a própria página mostra "não encontrado", com o caminho de volta.
      setProperty(null)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  const stepLightbox = (direction: 1 | -1) =>
    setLightboxIndex(current => (current === null ? null : (current + direction + gallery.length) % gallery.length))

  const generateLink = async (mode: "direct" | "roleta", roletaId: string, funnelId: string) => {
    if (!user || !propertyId) return
    if (mode === "roleta" && !roletaId) return

    setIsGeneratingLink(true)
    const query = new URLSearchParams(mode === "roleta" ? { roletaId } : { brokerId: user.id })
    if (funnelId !== DEFAULT_FUNNEL) query.set("funnelId", funnelId)
    const fullLink = `${window.location.origin}/imovel/${propertyId}?${query}`
    setShareableLink(fullLink)

    try {
      const response = await fetch("/api/short-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: fullLink }),
      })
      if (!response.ok) throw new Error("Falha ao gerar link curto.")
      const data = await response.json()
      setShareableLink(data.url)
    } catch {
      // Mantém o link completo caso o encurtamento falhe.
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleShareClick = async () => {
    if (!user || !propertyId) return

    setShareMode("direct")
    setSelectedRoletaId("")
    setSelectedFunnelId(DEFAULT_FUNNEL)
    setShareableLink("")
    setIsShareModalOpen(true)

    // Funis a que o usuário tem acesso, para escolher onde o lead do link entra.
    fetch("/api/funnels")
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const list = Array.isArray(data) ? data : data?.funnels ?? []
        setFunnels(list.map((f: any) => ({ id: f.id, name: f.name, isDefaultEntry: f.isDefaultEntry })))
      })
      .catch(() => null)

    if (isAdmin) {
      try {
        const response = await fetch("/api/roletas?status=active")
        if (response.ok) {
          const data = await response.json()
          setRoletas(data.map((r: any) => ({ id: r.id, name: r.name })))
        }
      } catch {
        // Sem roletas ativas: o modal só mostra a opção de receber diretamente.
      }
    }

    await generateLink("direct", "", DEFAULT_FUNNEL)
  }

  const handleShareModeChange = (mode: "direct" | "roleta") => {
    setShareMode(mode)
    if (mode === "direct") generateLink("direct", "", selectedFunnelId)
    else if (selectedRoletaId) generateLink("roleta", selectedRoletaId, selectedFunnelId)
    else setShareableLink("")
  }

  const handleRoletaChange = (roletaId: string) => {
    setSelectedRoletaId(roletaId)
    generateLink("roleta", roletaId, selectedFunnelId)
  }

  const handleFunnelChange = (funnelId: string) => {
    setSelectedFunnelId(funnelId)
    if (shareMode === "direct") generateLink("direct", "", funnelId)
    else if (selectedRoletaId) generateLink("roleta", selectedRoletaId, funnelId)
  }

  const copyToClipboard = async () => {
    if (!shareableLink) return
    try {
      await navigator.clipboard.writeText(shareableLink)
      toast({ title: "Link copiado" })
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar", description: "Selecione o link e copie manualmente." })
    }
  }

  if (loading) {
    return (
      <div className="p-3 md:p-4">
        <div className={`space-y-6 ${DASH_PANEL}`} aria-busy="true">
          <Skeleton className="h-10 w-72 max-w-full" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="aspect-[16/10] w-full rounded-[20px] lg:col-span-2" />
            <Skeleton className="h-64 w-full rounded-[20px]" />
          </div>
          <Skeleton className="h-48 w-full rounded-[20px]" />
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-3 md:p-4">
        <div className={`flex flex-col items-center py-16 text-center ${DASH_PANEL}`}>
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
            <Building className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold text-foreground">Imóvel não encontrado</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Ele pode ter sido excluído, ou o link está incorreto.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={fetchProperty}>Tentar de novo</Button>
            <Button asChild className="rounded-full">
              <Link href="/properties"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Voltar para Imóveis</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const status = STATUS[property.status]
  const prices = property.typologies.map(t => t.value).filter(v => v > 0)
  const bedrooms = rangeOf(property.typologies.map(t => t.dormitorios))
  const area = rangeOf(property.typologies.map(t => t.area))
  const interested = property.interestedClientsCount ?? 0
  const current = gallery[Math.min(selectedImage, Math.max(gallery.length - 1, 0))]
  const lightbox = lightboxIndex !== null ? gallery[lightboxIndex] : null
  const shareText = `${property.title}: ${shareableLink}`

  return (
    <div className="p-3 md:p-4">
      <div className={`space-y-5 sm:space-y-6 ${DASH_PANEL}`}>
        {/* Cabeçalho */}
        <div className="space-y-3">
          <Link href="/properties" className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Imóveis
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{property.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                {status && (
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-xs font-medium text-foreground dark:bg-[var(--bg-card-hover)]">
                    <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
                    {status.label}
                  </span>
                )}
                {property.type && <span>{property.type}</span>}
                {property.address && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{property.address}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="h-11 rounded-full px-5" onClick={handleShareClick}>
                <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />Compartilhar
              </Button>
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={`/properties/${property.id}/edit`}><Pencil className="mr-2 h-4 w-4" aria-hidden="true" />Editar</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Galeria: foto grande, setas, contador e miniaturas (fotos e plantas). */}
          <section aria-label="Fotos e plantas" className={`overflow-hidden lg:col-span-2 ${DASH_CARD}`}>
            {current ? (
              <>
                <div className="relative bg-muted">
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(selectedImage)}
                    aria-label="Ampliar imagem"
                    className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={current.url}
                      alt={current.label}
                      className={`aspect-[16/10] w-full ${current.isFloorPlan ? "bg-white object-contain" : "object-cover"}`}
                    />
                  </button>
                  {gallery.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Imagem anterior"
                        onClick={() => setSelectedImage(i => (i - 1 + gallery.length) % gallery.length)}
                        className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Próxima imagem"
                        onClick={() => setSelectedImage(i => (i + 1) % gallery.length)}
                        className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground backdrop-blur">
                        {selectedImage + 1} / {gallery.length}
                      </span>
                    </>
                  )}
                  {current.isFloorPlan && (
                    <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
                      {current.label}
                    </span>
                  )}
                </div>
                {gallery.length > 1 && (
                  <ul className="flex gap-2 overflow-x-auto p-3">
                    {gallery.map((img, index) => (
                      <li key={`${img.url}-${index}`} className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedImage(index)}
                          aria-label={img.isFloorPlan ? img.label : `Foto ${index + 1}`}
                          aria-current={index === selectedImage ? "true" : undefined}
                          className={`block overflow-hidden rounded-xl border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            index === selectedImage ? "border-[var(--accent-primary)]" : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" loading="lazy" className={`h-14 w-20 ${img.isFloorPlan ? "bg-white object-contain" : "object-cover"}`} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center bg-muted">
                <div className="text-center">
                  <Building className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
                  <p className="mt-2 text-sm text-muted-foreground">Nenhuma foto cadastrada.</p>
                </div>
              </div>
            )}
          </section>

          {/* Coluna lateral */}
          <div className="space-y-4">
            <section aria-label="Resumo" className={`p-5 ${DASH_CARD} ${DASH_HERO}`}>
              <p className="text-sm font-medium">{prices.length > 0 ? "A partir de" : "Preço"}</p>
              <p className="mt-1 text-3xl font-semibold leading-none tracking-tight tabular-nums sm:text-4xl">
                {prices.length > 0 ? formatCurrency(Math.min(...prices)) : "Não informado"}
              </p>
              {prices.length > 1 && Math.max(...prices) > Math.min(...prices) && (
                <p className="mt-2 text-xs text-[#07090D]/75">até {formatCurrency(Math.max(...prices))}</p>
              )}
            </section>

            <section aria-label="Números do imóvel" className={`space-y-3 p-5 ${DASH_CARD}`}>
              {bedrooms && <Spec icon={BedDouble} value={bedrooms} label="dormitórios" />}
              {area && <Spec icon={Ruler} value={`${area} m²`} label="de área" />}
              <Spec
                icon={Layers}
                value={String(property.typologies.length)}
                label={property.typologies.length === 1 ? "tipologia" : "tipologias"}
              />
              <Spec
                icon={Users}
                value={String(interested)}
                label={interested === 1 ? "cliente interessado" : "clientes interessados"}
              />
            </section>

            <section aria-labelledby="property-location" className={`space-y-2 p-5 ${DASH_CARD}`}>
              <h2 id="property-location" className="text-lg font-medium tracking-tight text-foreground">Localização</h2>
              <p className="text-sm text-muted-foreground">{property.address || "Endereço não informado."}</p>
              {property.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Abrir no mapa<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </section>
          </div>
        </div>

        {/* Tipologias */}
        <section aria-labelledby="property-typologies" className={`p-5 ${DASH_CARD}`}>
          <h2 id="property-typologies" className="text-lg font-medium tracking-tight text-foreground">Tipologias</h2>
          {property.typologies.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nenhuma tipologia cadastrada.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {property.typologies.map(typology => {
                const planIndex = typology.floorPlanUrl ? gallery.findIndex(img => img.url === typology.floorPlanUrl) : -1
                return (
                  <li key={typology.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
                    {planIndex >= 0 ? (
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(planIndex)}
                        aria-label={`Ver planta de ${typology.name}`}
                        className="flex-shrink-0 overflow-hidden rounded-xl border border-border transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={typology.floorPlanUrl as string} alt="" loading="lazy" className="h-14 w-20 bg-white object-contain" />
                      </button>
                    ) : (
                      <span className="grid h-14 w-20 flex-shrink-0 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                        Sem planta
                      </span>
                    )}
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate font-medium text-foreground">{typology.name || "Sem nome"}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {typology.area != null && <Spec icon={Ruler} value={`${typology.area} m²`} label="" />}
                        {typology.dormitorios != null && <Spec icon={BedDouble} value={String(typology.dormitorios)} label="dorm." />}
                        {typology.suites != null && <Spec icon={Bath} value={String(typology.suites)} label={typology.suites === 1 ? "suíte" : "suítes"} />}
                        {typology.vagas != null && <Spec icon={Car} value={String(typology.vagas)} label={typology.vagas === 1 ? "vaga" : "vagas"} />}
                      </div>
                    </div>
                    <p className="text-lg font-semibold tracking-tight tabular-nums text-foreground">
                      {typology.value > 0 ? formatCurrency(typology.value) : <span className="text-sm font-normal text-muted-foreground">Preço não informado</span>}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Características */}
        {property.features && property.features.length > 0 && (
          <section aria-labelledby="property-features" className={`p-5 ${DASH_CARD}`}>
            <h2 id="property-features" className="text-lg font-medium tracking-tight text-foreground">Características do empreendimento</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {property.features.map((feature, index) => (
                <li key={`${feature}-${index}`} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">{feature}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Última edição por {property.updaterName || property.creatorName || "—"} em {new Date(property.updatedAt).toLocaleDateString("pt-BR")}.
        </p>
      </div>

      {/* Compartilhar */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar imóvel</DialogTitle>
            <DialogDescription>Copie o link ou envie direto pelo WhatsApp. Quem se cadastrar por ele vira um lead.</DialogDescription>
          </DialogHeader>

          {isAdmin && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="share-mode">Quem recebe os leads deste link?</Label>
                <Select value={shareMode} onValueChange={v => handleShareModeChange(v as "direct" | "roleta")}>
                  <SelectTrigger id="share-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Eu mesmo (receber diretamente)</SelectItem>
                    <SelectItem value="roleta">Distribuir por roleta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {shareMode === "roleta" && (
                <div className="space-y-1.5">
                  <Label htmlFor="share-roleta">Roleta</Label>
                  <Select value={selectedRoletaId} onValueChange={handleRoletaChange}>
                    <SelectTrigger id="share-roleta"><SelectValue placeholder="Selecione uma roleta" /></SelectTrigger>
                    <SelectContent>
                      {roletas.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma roleta ativa encontrada</div>
                      ) : (
                        roletas.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {funnels.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="share-funnel">Em qual funil o lead entra?</Label>
              <Select value={selectedFunnelId} onValueChange={handleFunnelChange}>
                <SelectTrigger id="share-funnel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_FUNNEL}>
                    {shareMode === "roleta" ? "Funil da roleta (ou o de entrada padrão)" : "Funil de entrada padrão"}
                  </SelectItem>
                  {funnels.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}{f.isDefaultEntry ? " (entrada padrão)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O lead entra na primeira etapa do funil escolhido.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="share-link">Link</Label>
            <div className="flex items-center gap-2">
              <Input id="share-link" value={isGeneratingLink ? "Gerando link..." : shareableLink} readOnly onFocus={e => e.target.select()} />
              <Button type="button" onClick={copyToClipboard} disabled={isGeneratingLink || !shareableLink} className="flex-shrink-0">
                {isGeneratingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
                Copiar
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {shareableLink && !isGeneratingLink ? (
              <Button asChild variant="outline">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />Enviar pelo WhatsApp
                </a>
              </Button>
            ) : <span />}
            <Button variant="secondary" onClick={() => setIsShareModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tela cheia: Esc fecha, setas do teclado navegam. */}
      <Dialog open={lightbox !== null} onOpenChange={open => { if (!open) setLightboxIndex(null) }}>
        <DialogContent
          className="flex h-dvh max-h-none w-screen max-w-none flex-col items-center justify-center gap-3 rounded-none border-0 bg-black/95 p-4 text-white sm:rounded-none"
          onKeyDown={e => {
            if (gallery.length < 2) return
            if (e.key === "ArrowRight") stepLightbox(1)
            if (e.key === "ArrowLeft") stepLightbox(-1)
          }}
        >
          <DialogTitle className="sr-only">{lightbox?.label ?? "Imagem"}</DialogTitle>
          <DialogDescription className="text-sm text-white/70" aria-live="polite">
            {lightboxIndex !== null ? `${lightboxIndex + 1} / ${gallery.length}` : ""}
            {lightbox?.isFloorPlan ? ` · ${lightbox.label}` : ""}
          </DialogDescription>
          {lightbox && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox.url} alt={lightbox.label} className="max-h-[80dvh] max-w-full rounded-lg object-contain" />
          )}
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Imagem anterior"
                onClick={() => stepLightbox(-1)}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Próxima imagem"
                onClick={() => stepLightbox(1)}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
