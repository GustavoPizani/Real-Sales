"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { MapPin, Loader2, Send, Bed, Car, Square, CheckCircle2, ChevronDown, ArrowRight, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PublicTypology {
  id: string
  name: string
  value: number
  area?: number | null
  dormitorios?: number | null
  suites?: number | null
  vagas?: number | null
  floorPlanUrl?: string | null
}

interface PublicProperty {
  id: string
  title: string
  address?: string | null
  type?: string | null
  status: string
  features: string[]
  images: { id: string; url: string }[]
  propertyTypes: PublicTypology[]
}

const STATUS_LABEL: Record<string, string> = {
  LANCAMENTO: "Lançamento",
  EM_OBRAS: "Em Obras",
  PRONTO: "Pronto para Morar",
}

export default function PublicPropertyViewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-custom" />
      </div>
    }>
      <PropertyPage />
    </Suspense>
  )
}

function PropertyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const contactRef = useRef<HTMLElement>(null)

  const [property, setProperty] = useState<PublicProperty | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0) // kept for compat
  const [brokerId, setBrokerId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [leadName, setLeadName] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadMessage, setLeadMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [floorPlanModal, setFloorPlanModal] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  const openGallery = (index: number) => { setGalleryIndex(index); setGalleryOpen(true) }
  const closeGallery = () => setGalleryOpen(false)
  const prevImage = () => setGalleryIndex(i => (i - 1 + (property?.images.length ?? 1)) % (property?.images.length ?? 1))
  const nextImage = () => setGalleryIndex(i => (i + 1) % (property?.images.length ?? 1))

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id

  useEffect(() => {
    const bId = searchParams.get("brokerId")
    if (bId) setBrokerId(bId)
  }, [searchParams])

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/public/properties/${propertyId}`)
      if (!response.ok) throw new Error("Imóvel não encontrado.")
      const data = await response.json()
      setProperty(data)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message })
    } finally {
      setLoading(false)
    }
  }, [propertyId, toast])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: leadName, email: leadEmail, phone: leadPhone, message: leadMessage, propertyId, brokerId }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Falha ao enviar.")
      }
      setSubmitted(true)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao enviar", description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToContact = () => {
    contactRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-custom" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-3 text-foreground">Imóvel não encontrado</h2>
          <p className="text-muted-foreground">O link pode estar incorreto ou o imóvel não está mais disponível.</p>
        </div>
      </div>
    )
  }

  const heroImage = property.images[0]?.url || "/placeholder.jpg"
  const hasTypologies = property.propertyTypes && property.propertyTypes.length > 0

  return (
    <div className="bg-background text-foreground min-h-screen">

      {/* ── STICKY HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-secondary-custom font-bold tracking-widest text-xs uppercase">Real Sales</span>
          <span className="text-muted-foreground/30">|</span>
          <span className="text-muted-foreground text-sm truncate max-w-[200px] sm:max-w-none">{property.title}</span>
        </div>
        <button
          onClick={scrollToContact}
          className="bg-secondary-custom hover:bg-secondary-custom/80 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors"
        >
          Tenho Interesse
        </button>
      </header>

      {/* ── HERO + GALERIA ── */}
      <section className="pt-[64px] px-4 sm:px-6 lg:px-10 pt-[72px] pb-0">

        {/* Grid compacto — altura fixa 480px no desktop */}
        <div className="h-[260px] sm:h-[380px] lg:h-[480px] grid grid-cols-2 lg:grid-cols-[1fr_1fr] gap-2 rounded-2xl overflow-hidden">

          {/* Imagem principal */}
          <button
            onClick={() => openGallery(0)}
            className="relative overflow-hidden group h-full col-span-1 lg:col-span-1 block"
          >
            <img src={heroImage} alt={property.title} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                <ZoomIn className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </button>

          {/* Grade 2×2 à direita */}
          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
            {[1, 2, 3, 4].map((i) => {
              const img = property.images[i]
              const isLast = i === 4 && property.images.length > 5
              if (!img) return <div key={i} className="bg-muted rounded-lg" />
              return (
                <button
                  key={img.id}
                  onClick={() => openGallery(i)}
                  className="relative overflow-hidden group rounded-lg block h-full"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500" />
                  {isLast && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-lg">
                      <span className="text-white font-bold text-base">+{property.images.length - 5} Fotos</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Título e info — abaixo da galeria, estilo muvon */}
        <div className="pt-5 pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-block bg-secondary-custom/20 border border-secondary-custom/40 text-secondary-custom text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
              {STATUS_LABEL[property.status] ?? property.status}
            </span>
            {property.type && (
              <span className="inline-block border border-border text-muted-foreground text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full">
                {property.type}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
            {property.title}
          </h1>
          {property.address && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-3">
              <MapPin className="h-3.5 w-3.5 text-secondary-custom flex-shrink-0" />
              <span>{property.address}</span>
            </div>
          )}
        </div>

        <div className="border-b border-border" />
      </section>

      {/* ── FEATURES ── */}
      {property.features && property.features.length > 0 && (
        <section className="px-6 sm:px-12 lg:px-20 py-16 border-t border-border">
          <div className="max-w-5xl">
            <p className="text-secondary-custom text-xs font-bold tracking-widest uppercase mb-3">Diferenciais</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-10 text-foreground">
              Infraestrutura completa<br />para o seu estilo de vida
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {property.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-secondary-custom/40 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-secondary-custom flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TIPOLOGIAS / PLANTAS ── */}
      {hasTypologies && (
        <section className="px-6 sm:px-12 lg:px-20 py-16 border-t border-border">
          <p className="text-secondary-custom text-xs font-bold tracking-widest uppercase mb-3">Plantas</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 text-foreground">
            Opções que cabem<br />no seu momento
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {property.propertyTypes.map((t) => (
              <div
                key={t.id}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-secondary-custom/50 transition-all duration-300"
              >
                {t.floorPlanUrl && (
                  <button
                    className="w-full aspect-video overflow-hidden block relative"
                    onClick={() => setFloorPlanModal(t.floorPlanUrl!)}
                  >
                    <img
                      src={t.floorPlanUrl}
                      alt={`Planta ${t.name}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Ver planta</span>
                    </div>
                  </button>
                )}
                <div className="p-6 cursor-pointer" onClick={scrollToContact}>
                  <div className="flex items-start justify-between mb-5">
                    <p className="text-foreground font-semibold text-lg leading-tight">{t.name}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-secondary-custom group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {t.area != null && (
                      <div className="flex items-center gap-2">
                        <Square className="h-3.5 w-3.5 text-secondary-custom/70" />
                        <span className="text-muted-foreground text-sm">{t.area} m²</span>
                      </div>
                    )}
                    {t.dormitorios != null && (
                      <div className="flex items-center gap-2">
                        <Bed className="h-3.5 w-3.5 text-secondary-custom/70" />
                        <span className="text-muted-foreground text-sm">{t.dormitorios} {t.dormitorios === 1 ? "quarto" : "quartos"}</span>
                      </div>
                    )}
                    {t.suites != null && (
                      <div className="flex items-center gap-2">
                        <Bed className="h-3.5 w-3.5 text-secondary-custom/70" />
                        <span className="text-muted-foreground text-sm">{t.suites} {t.suites === 1 ? "suíte" : "suítes"}</span>
                      </div>
                    )}
                    {t.vagas != null && (
                      <div className="flex items-center gap-2">
                        <Car className="h-3.5 w-3.5 text-secondary-custom/70" />
                        <span className="text-muted-foreground text-sm">{t.vagas} {t.vagas === 1 ? "vaga" : "vagas"}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-border">
                    <p className="text-muted-foreground text-sm">Consulte condições com o corretor</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── LOCALIZAÇÃO ── */}
      {property.address && (
        <section className="px-6 sm:px-12 lg:px-20 py-16 border-t border-border">
          <p className="text-secondary-custom text-xs font-bold tracking-widest uppercase mb-3">Localização</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-foreground">
            Onde fica o empreendimento
          </h2>
          <div className="flex items-center gap-2 mb-6 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4 text-secondary-custom flex-shrink-0" />
            <span>{property.address}</span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 420 }}>
            <iframe
              title="Localização do empreendimento"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}&q=${encodeURIComponent(property.address)}&zoom=15`}
            />
          </div>
        </section>
      )}

      {/* ── GALLERY MODAL ── */}
      {galleryOpen && property.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={closeGallery}
        >
          {/* Fechar */}
          <button
            onClick={closeGallery}
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Contador */}
          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/40 text-sm tabular-nums">
            {galleryIndex + 1} / {property.images.length}
          </span>

          {/* Prev */}
          {property.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage() }}
              className="absolute left-4 sm:left-8 text-white/60 hover:text-white transition-colors z-10 bg-black/30 hover:bg-black/50 rounded-full p-2"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Imagem */}
          <div className="relative max-w-5xl max-h-[85vh] w-full px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={property.images[galleryIndex]?.url}
              alt={`${property.title} — foto ${galleryIndex + 1}`}
              className="w-full h-full object-contain rounded-xl"
              style={{ maxHeight: "85vh" }}
            />
          </div>

          {/* Next */}
          {property.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage() }}
              className="absolute right-4 sm:right-8 text-white/60 hover:text-white transition-colors z-10 bg-black/30 hover:bg-black/50 rounded-full p-2"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Miniaturas no rodapé do modal */}
          {property.images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 px-4 max-w-full overflow-x-auto">
              {property.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex(i) }}
                  className={`flex-shrink-0 w-12 h-8 rounded overflow-hidden border-2 transition-all ${
                    i === galleryIndex ? "border-secondary-custom" : "border-white/20 opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FLOOR PLAN MODAL ── */}
      {floorPlanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setFloorPlanModal(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setFloorPlanModal(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <X className="h-4 w-4" /> Fechar
            </button>
            <img
              src={floorPlanModal}
              alt="Planta do apartamento"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ── CONTACT ── */}
      <section ref={contactRef} className="px-6 sm:px-12 lg:px-20 py-24 border-t border-border bg-card">
        <div className="max-w-2xl mx-auto">
          <p className="text-secondary-custom text-xs font-bold tracking-widest uppercase mb-3 text-center">Contato</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-center text-foreground">Fale com um especialista</h2>
          <p className="text-muted-foreground text-center mb-10">Preencha o formulário e entraremos em contato em breve.</p>

          {submitted ? (
            <div className="text-center py-16 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-secondary-custom mx-auto" />
              <h3 className="text-2xl font-bold text-foreground">Mensagem enviada!</h3>
              <p className="text-muted-foreground">Nosso especialista entrará em contato em breve.</p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nome completo *</label>
                  <input
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-secondary-custom/60 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Telefone / WhatsApp *</label>
                  <input
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-secondary-custom/60 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">E-mail *</label>
                <input
                  required
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-secondary-custom/60 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Mensagem <span className="normal-case text-muted-foreground/40">(opcional)</span>
                </label>
                <textarea
                  rows={4}
                  value={leadMessage}
                  onChange={(e) => setLeadMessage(e.target.value)}
                  placeholder={`Olá, tenho interesse no ${property.title} e gostaria de mais informações.`}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-secondary-custom/60 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-secondary-custom hover:bg-secondary-custom/80 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors text-base"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {isSubmitting ? "Enviando..." : "Quero mais informações"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 sm:px-12 lg:px-20 py-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-secondary-custom font-bold tracking-widest text-xs uppercase">Real Sales CRM</span>
        <span className="text-muted-foreground/40 text-xs">Este link foi gerado pelo corretor responsável pelo atendimento.</span>
      </footer>
    </div>
  )
}
