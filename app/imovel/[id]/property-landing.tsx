"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import {
  BedDouble, Building, Car, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Images, LinkIcon,
  Loader2, Lock, MapPin, Plus, Ruler, Send, X,
} from "lucide-react"

interface PublicTypology {
  id: string
  name: string
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
  attendantName?: string | null
}

type PriceMap = Record<string, number>
type LoadState = "loading" | "ready" | "invalid_link" | "not_found"

const STATUS_LABEL: Record<string, string> = {
  LANCAMENTO: "Lançamento",
  EM_OBRAS: "Em obras",
  PRONTO: "Pronto para morar",
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)

// Botão principal: dourado da marca com texto escuro (9:1). Texto branco sobre o dourado dava 1,9:1.
const CTA =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] font-semibold text-[#07090D] transition-colors hover:bg-[#E6CB98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
const FIELD =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow-strong)]"
const SECTION_TITLE = "text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"

/** "2 a 3" quando os valores variam, "2" quando são iguais, null quando não há dado. */
function rangeOf(values: (number | null | undefined)[]): string | null {
  const known = values.filter((v): v is number => typeof v === "number" && v > 0)
  if (known.length === 0) return null
  const min = Math.min(...known)
  const max = Math.max(...known)
  const format = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
  return min === max ? format(min) : `${format(min)} a ${format(max)}`
}

// Os preços liberados ficam guardados neste navegador: quem já se cadastrou não precisa repetir ao voltar.
const unlockKey = (propertyId: string) => `lp:prices:${propertyId}`

function Message({ icon: Icon, title, children }: { icon: typeof LinkIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

export function PropertyLanding() {
  const params = useParams()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLElement>(null)
  const plansRef = useRef<HTMLElement>(null)

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id
  const brokerId = searchParams.get("brokerId")
  const roletaId = searchParams.get("roletaId")
  const funnelId = searchParams.get("funnelId")

  const [property, setProperty] = useState<PublicProperty | null>(null)
  const [state, setState] = useState<LoadState>("loading")
  const [prices, setPrices] = useState<PriceMap | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const [leadName, setLeadName] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadMessage, setLeadMessage] = useState("")
  const [website, setWebsite] = useState("") // campo-isca para robôs; pessoas não veem
  // E-mail e mensagem são opcionais e ficam recolhidos: o formulário abre só com nome e telefone.
  const [showExtraFields, setShowExtraFields] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return
    // Sem corretor nem roleta no link não há para quem entregar o contato: nem busca o imóvel.
    if (!brokerId && !roletaId) {
      setState("invalid_link")
      return
    }
    setState("loading")
    try {
      const query = new URLSearchParams(roletaId ? { roletaId } : { brokerId: brokerId as string })
      const response = await fetch(`/api/public/properties/${propertyId}?${query}`)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setState(data?.code === "invalid_link" ? "invalid_link" : "not_found")
        return
      }
      setProperty(await response.json())
      setState("ready")
    } catch {
      setState("not_found")
    }
  }, [propertyId, brokerId, roletaId])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  useEffect(() => {
    if (!propertyId) return
    try {
      const saved = window.localStorage.getItem(unlockKey(propertyId))
      if (saved) setPrices(JSON.parse(saved))
    } catch {
      // Sem armazenamento ou valor inválido: os preços continuam fechados.
    }
  }, [propertyId])

  // Fotos primeiro, depois as plantas: uma galeria só, aberta em tela cheia.
  const gallery = useMemo(
    () =>
      property
        ? [
            ...property.images.map((img, i) => ({ url: img.url, label: `${property.title}, foto ${i + 1}`, isFloorPlan: false })),
            ...property.propertyTypes
              .filter(t => t.floorPlanUrl)
              .map(t => ({ url: t.floorPlanUrl as string, label: `Planta: ${t.name}`, isFloorPlan: true })),
          ]
        : [],
    [property],
  )

  const stepLightbox = useCallback(
    (direction: 1 | -1) =>
      setLightboxIndex(current => (current === null ? null : (current + direction + gallery.length) % gallery.length)),
    [gallery.length],
  )

  // Tela cheia: Esc fecha, setas navegam, e a página por trás não rola.
  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null)
      if (e.key === "ArrowRight") stepLightbox(1)
      if (e.key === "ArrowLeft") stepLightbox(-1)
    }
    window.addEventListener("keydown", onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [lightboxIndex, stepLightbox])

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    const digits = leadPhone.replace(/\D/g, "")
    if (digits.length < 10) {
      setFormError("Informe o telefone com DDD.")
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName, email: leadEmail, phone: leadPhone, message: leadMessage,
          propertyId, brokerId, roletaId, funnelId, website,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Não foi possível enviar. Tente novamente.")

      const unlocked: PriceMap = {}
      for (const item of data?.prices ?? []) unlocked[item.id] = item.value
      setPrices(unlocked)
      setJustSubmitted(true)
      try {
        if (propertyId) window.localStorage.setItem(unlockKey(propertyId), JSON.stringify(unlocked))
      } catch {
        // Sem armazenamento: os preços valem só até recarregar a página.
      }
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  const scrollToPlans = () => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  if (state === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    )
  }

  if (state === "invalid_link") {
    return (
      <Message icon={LinkIcon} title="Este link não está disponível">
        Ele está incompleto ou expirou. Peça um novo link ao corretor que enviou este para você.
      </Message>
    )
  }

  if (state === "not_found" || !property) {
    return (
      <Message icon={Building} title="Imóvel não encontrado">
        O link pode estar incorreto ou o imóvel não está mais disponível.
      </Message>
    )
  }

  const unlocked = prices !== null
  const knownPrices = unlocked ? Object.values(prices).filter(v => v > 0) : []
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const hasMapsKey = !!mapsKey && mapsKey !== "[SENSITIVE]"
  const mapQuery = encodeURIComponent(property.address ?? "")
  const mapSrc = hasMapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${mapQuery}&zoom=15`
    : `https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`
  const photos = property.images
  const lightbox = lightboxIndex !== null ? gallery[lightboxIndex] : null
  const hasFeatures = property.features.length > 0
  const hasPlans = property.propertyTypes.length > 0
  const bedrooms = rangeOf(property.propertyTypes.map(t => t.dormitorios))
  const area = rangeOf(property.propertyTypes.map(t => t.area))
  const parking = rangeOf(property.propertyTypes.map(t => t.vagas))
  // Blocos da coluna da esquerda no desktop, abaixo das fotos (título + os que existirem);
  // o formulário ocupa a coluna da direita ao longo de todos.
  const leftBlocks = 1 + (hasPlans ? 1 : 0) + (hasFeatures ? 1 : 0) + (property.address ? 1 : 0)

  return (
    <div className="min-h-dvh bg-background pb-24 text-foreground lg:pb-0">
      {/* Cabeçalho fixo */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary-custom">Nordic</span>
            <span className="text-border" aria-hidden="true">|</span>
            <span className="truncate text-sm text-muted-foreground">{property.title}</span>
          </div>
          {!unlocked && (
            <button type="button" onClick={scrollToForm} className={`${CTA} hidden h-10 flex-shrink-0 px-5 text-sm sm:inline-flex`}>
              Tenho interesse
            </button>
          )}
        </div>
      </header>

      {/*
        Ordem dos blocos (a do HTML é a do celular):
          foto → título e números → plantas → contato → diferenciais → localização
        No desktop as fotos ocupam a largura toda; abaixo delas, duas colunas:
        o conteúdo à esquerda e o contato à direita, acompanhando a rolagem.
      */}
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10 pt-20 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-x-10 lg:gap-y-10">
        {/* Fotos: no celular, uma foto grande; no desktop, a principal com quatro ao lado, na largura toda. */}
        <div className="lg:col-span-2">
          {photos.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl">
              <div className="lg:grid lg:h-[460px] lg:grid-cols-2 lg:gap-2">
                <button type="button" onClick={() => setLightboxIndex(0)} aria-label="Ver fotos em tela cheia" className="group block h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos[0].url} alt={property.title} className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] lg:aspect-auto" />
                </button>
                <div className="hidden grid-cols-2 grid-rows-2 gap-2 lg:grid">
                  {[1, 2, 3, 4].map(i => {
                    const img = photos[i]
                    if (!img) return <div key={i} className="bg-muted" />
                    return (
                      <button key={img.id} type="button" onClick={() => setLightboxIndex(i)} aria-label={`Ver foto ${i + 1}`} className="group block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                      </button>
                    )
                  })}
                </div>
              </div>
              {gallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(0)}
                  className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full bg-background/90 px-4 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Images className="h-4 w-4" aria-hidden="true" />Ver {gallery.length} imagens
                </button>
              )}
            </div>
          ) : (
            <div className="grid aspect-[16/9] place-items-center rounded-2xl bg-muted">
              <Building className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Título e números do imóvel */}
        <div className="lg:col-start-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--accent-glow-strong)] px-3 py-1 text-xs font-semibold text-foreground">
              {STATUS_LABEL[property.status] ?? property.status}
            </span>
            {property.type && (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">{property.type}</span>
            )}
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">{property.title}</h1>
          {property.address && (
            <p className="mt-3 flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{property.address}</span>
            </p>
          )}
          {(bedrooms || area || parking) && (
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 text-foreground">
              {bedrooms && (
                <li className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <span><span className="font-semibold">{bedrooms}</span> <span className="text-muted-foreground">{bedrooms === "1" ? "quarto" : "quartos"}</span></span>
                </li>
              )}
              {area && (
                <li className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <span><span className="font-semibold">{area}</span> <span className="text-muted-foreground">m²</span></span>
                </li>
              )}
              {parking && (
                <li className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <span><span className="font-semibold">{parking}</span> <span className="text-muted-foreground">{parking === "1" ? "vaga" : "vagas"}</span></span>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Plantas: vêm antes dos diferenciais porque o preço fechado é o motivo do cadastro. */}
        {hasPlans && (
          <section ref={plansRef} aria-labelledby="lp-plans" className="scroll-mt-20 lg:col-start-1">
            <h2 id="lp-plans" className={SECTION_TITLE}>Plantas</h2>
            <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {property.propertyTypes.map(t => {
                const planIndex = t.floorPlanUrl ? gallery.findIndex(img => img.url === t.floorPlanUrl) : -1
                const price = unlocked ? prices[t.id] : undefined
                return (
                  <li key={t.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                    {planIndex >= 0 && (
                      <button type="button" onClick={() => setLightboxIndex(planIndex)} aria-label={`Ampliar planta de ${t.name}`} className="block w-full bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.floorPlanUrl as string} alt={`Planta ${t.name}`} loading="lazy" className="aspect-video w-full object-contain" />
                      </button>
                    )}
                    <div className="space-y-3 p-5">
                      <h3 className="text-lg font-semibold leading-tight text-foreground">{t.name}</h3>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                        {t.area != null && <li className="flex items-center gap-1.5"><Ruler className="h-4 w-4" aria-hidden="true" />{t.area} m²</li>}
                        {t.dormitorios != null && <li className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" aria-hidden="true" />{t.dormitorios} {t.dormitorios === 1 ? "quarto" : "quartos"}</li>}
                        {t.suites != null && <li className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" aria-hidden="true" />{t.suites} {t.suites === 1 ? "suíte" : "suítes"}</li>}
                        {t.vagas != null && <li className="flex items-center gap-1.5"><Car className="h-4 w-4" aria-hidden="true" />{t.vagas} {t.vagas === 1 ? "vaga" : "vagas"}</li>}
                      </ul>
                      <div className="border-t border-border pt-3">
                        {unlocked ? (
                          price && price > 0 ? (
                            <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">{formatBRL(price)}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Preço sob consulta.</p>
                          )
                        ) : (
                          <button type="button" onClick={scrollToForm} className="inline-flex items-center gap-2 rounded-full text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Lock className="h-4 w-4" aria-hidden="true" />Deixe seu contato para ver o preço
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Contato. Celular: depois das plantas. Desktop: coluna da direita, do topo ao fim, fixa na rolagem. */}
        <aside
          ref={formRef}
          id="contato"
          className="scroll-mt-20 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-2 lg:self-start"
          style={{ gridRowEnd: `span ${leftBlocks}` }}
        >
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
            {unlocked ? (
              <div className="space-y-3 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-foreground">{justSubmitted ? "Recebemos seu contato" : "Você já tem acesso aos preços"}</h2>
                <p className="text-sm text-muted-foreground">
                  {justSubmitted
                    ? `${property.attendantName ? `${property.attendantName} vai` : "Um corretor vai"} falar com você em breve. Os preços das plantas já estão liberados.`
                    : "Os preços das plantas estão liberados neste aparelho."}
                </p>
                {knownPrices.length > 0 && (
                  <p className="pt-1">
                    <span className="block text-xs text-muted-foreground">A partir de</span>
                    <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{formatBRL(Math.min(...knownPrices))}</span>
                  </p>
                )}
                {hasPlans && (
                  <button type="button" onClick={scrollToPlans} className={`${CTA} h-12 w-full px-5`}>
                    Ver preços das plantas
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4" noValidate>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Veja os preços e fale com um corretor</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Deixe seu contato para liberar os preços das plantas.
                    {property.attendantName ? ` Quem atende é ${property.attendantName}.` : ""}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lead-name" className="text-sm font-medium text-foreground">Nome</label>
                  <input id="lead-name" required autoComplete="name" value={leadName} onChange={e => setLeadName(e.target.value)} className={FIELD} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="lead-phone" className="text-sm font-medium text-foreground">Telefone ou WhatsApp</label>
                  <input
                    id="lead-phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    value={leadPhone}
                    onChange={e => setLeadPhone(e.target.value)}
                    className={FIELD}
                  />
                </div>

                {showExtraFields ? (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="lead-email" className="text-sm font-medium text-foreground">
                        E-mail <span className="font-normal text-muted-foreground">(opcional)</span>
                      </label>
                      <input id="lead-email" type="email" inputMode="email" autoComplete="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} className={FIELD} />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="lead-message" className="text-sm font-medium text-foreground">
                        Mensagem <span className="font-normal text-muted-foreground">(opcional)</span>
                      </label>
                      <textarea id="lead-message" rows={3} value={leadMessage} onChange={e => setLeadMessage(e.target.value)} className={`${FIELD} resize-none`} />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowExtraFields(true)}
                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />Adicionar e-mail ou mensagem
                  </button>
                )}

                {/* Campo-isca: invisível e fora da navegação por teclado. Só robôs preenchem. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="lead-website">Site</label>
                  <input id="lead-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>

                {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}

                <button type="submit" disabled={isSubmitting} className={`${CTA} h-12 w-full px-5 text-base`}>
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
                  {isSubmitting ? "Enviando..." : "Liberar preços"}
                </button>
                <p className="text-xs text-muted-foreground">
                  Ao enviar, você concorda em ser contatado por telefone, WhatsApp ou e-mail sobre este imóvel.
                </p>
              </form>
            )}
          </div>
        </aside>

        {/* Diferenciais */}
        {hasFeatures && (
          <section aria-labelledby="lp-features" className="lg:col-start-1">
            <h2 id="lp-features" className={SECTION_TITLE}>Diferenciais</h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {property.features.map((feature, i) => (
                <li key={`${feature}-${i}`} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary-custom" aria-hidden="true" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Localização */}
        {property.address && (
          <section aria-labelledby="lp-location" className="lg:col-start-1">
            <h2 id="lp-location" className={SECTION_TITLE}>Localização</h2>
            <p className="mt-3 flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{property.address}</span>
            </p>
            {/* O mapa aparece sempre. Com a chave do Google usa a API de mapas embutidos;
                sem ela (ou com a chave em branco), usa o mapa embutido comum, que não exige chave. */}
            <div className="mt-4 h-[360px] overflow-hidden rounded-2xl border border-border">
              <iframe
                title="Localização do empreendimento"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc}
              />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Abrir no Google Maps<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </section>
        )}
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-border px-4 py-8 sm:flex-row sm:px-6">
        <span className="text-xs font-bold uppercase tracking-widest text-secondary-custom">Nordic CRM</span>
        <span className="text-xs text-muted-foreground">Este link foi gerado pela nossa equipe de atendimento.</span>
      </footer>

      {/* Celular: botão de contato sempre à mão, até a pessoa se cadastrar. */}
      {!unlocked && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={scrollToForm} className={`${CTA} h-12 w-full px-5 text-base`}>Ver preços e falar com um corretor</button>
        </div>
      )}

      {/* Tela cheia */}
      {lightbox && lightboxIndex !== null && (
        <div role="dialog" aria-modal="true" aria-label={lightbox.label} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/95 p-4" onClick={() => setLightboxIndex(null)}>
          <p className="text-sm text-white/75" aria-live="polite">
            {lightboxIndex + 1} / {gallery.length}{lightbox.isFloorPlan ? ` · ${lightbox.label}` : ""}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.label} onClick={e => e.stopPropagation()} className={`max-h-[80dvh] max-w-full rounded-lg object-contain ${lightbox.isFloorPlan ? "bg-white" : ""}`} />
          <button
            type="button"
            autoFocus
            aria-label="Fechar"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          {gallery.length > 1 && (
            <>
              <button type="button" aria-label="Imagem anterior" onClick={e => { e.stopPropagation(); stepLightbox(-1) }} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Próxima imagem" onClick={e => { e.stopPropagation(); stepLightbox(1) }} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
