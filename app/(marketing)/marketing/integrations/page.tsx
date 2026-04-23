"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Facebook, Plus, Trash2, RefreshCw, CheckCircle2, Zap, Copy, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

interface Page {
  id: string
  pageId: string
  pageName: string
}
interface Form {
  id: string
  name: string
  status: string
}
interface FunnelStage {
  id: string
  name: string
}
interface Funnel {
  id: string
  name: string
  stages: FunnelStage[]
}
interface Property {
  id: string
  title: string
}
interface Roulette {
  id: string
  name: string
}
interface BrokerUser {
  id: string
  name: string
}
interface Mapping {
  id: string
  formId: string
  formName: string
  connection: { pageName: string; pageId: string }
  property?: { title: string } | null
  funnel?: { name: string } | null
  funnelStage?: { name: string } | null
  defaultBroker?: { name: string } | null
  agencia?: string | null
  praca?: string | null
  isActive: boolean
  leadCount: number
  lastSyncedAt?: string | null
}

interface FormQuestion {
  type: string
  label: string
  key: string
}

const CRM_TARGETS = [
  { value: "fullName", label: "Nome Completo" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "observations", label: "Observações" },
  { value: "ignore", label: "Ignorar" },
]

const AUTO_DETECT: Record<string, string> = {
  FULL_NAME: "fullName",
  FIRST_NAME: "fullName",
  EMAIL: "email",
  PHONE: "phone",
  PHONE_NUMBER: "phone",
}

const EMPTY_FORM = {
  connectionId: "",
  formId: "",
  formName: "",
  pageId: "",
  propertyId: "",
  roletaId: "",
  funnelId: "",
  funnelStageId: "",
  agencia: "",
  praca: "",
  defaultBrokerId: "",
  syncLeads: false,
}

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [pages, setPages] = useState<Page[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [roulettes, setRoulettes] = useState<Roulette[]>([])
  const [brokers, setBrokers] = useState<BrokerUser[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])

  const [loadingPages, setLoadingPages] = useState(false)
  const [loadingForms, setLoadingForms] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [savingMapping, setSavingMapping] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [connectingFb, setConnectingFb] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [verifyToken, setVerifyToken] = useState("")
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([])
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState(EMPTY_FORM)

  const selectedFunnel = funnels.find((f) => f.id === formData.funnelId)
  const funnelStages = selectedFunnel?.stages ?? []

  const fetchCrmData = useCallback(async () => {
    const [fRes, pRes, rRes, uRes, mRes] = await Promise.all([
      fetch("/api/funnels"),
      fetch("/api/properties"),
      fetch("/api/roletas"),
      fetch("/api/users"),
      fetch("/api/facebook/mappings"),
    ])
    if (fRes.ok) { const d = await fRes.json(); setFunnels(Array.isArray(d) ? d : d.funnels ?? []) }
    if (pRes.ok) { const d = await pRes.json(); setProperties(Array.isArray(d) ? d : d.properties ?? []) }
    if (rRes.ok) { const d = await rRes.json(); setRoulettes(Array.isArray(d) ? d : d.roulettes ?? []) }
    if (uRes.ok) { const d = await uRes.json(); setBrokers(d.users ?? []) }
    if (mRes.ok) { const d = await mRes.json(); setMappings(d.mappings ?? []) }
  }, [])

  const fetchPages = useCallback(async () => {
    setLoadingPages(true)
    try {
      const res = await fetch("/api/facebook/pages")
      if (res.ok) { const d = await res.json(); setPages(d.pages ?? []) }
    } finally {
      setLoadingPages(false)
    }
  }, [])

  useEffect(() => {
    fetchCrmData()
    fetchPages()
    fetch("/api/facebook/webhook-config")
      .then((r) => r.json())
      .then((d) => { setWebhookUrl(d.webhookUrl ?? ""); setVerifyToken(d.verifyToken ?? "") })
      .catch(() => {})
  }, [fetchCrmData, fetchPages])

  // Escuta o resultado do popup OAuth do Facebook
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== "fb_oauth_done") return

      setConnectingFb(false)
      if (event.data.success) {
        toast({ title: "Facebook conectado!", description: "Páginas sincronizadas com sucesso." })
        fetchPages()
        fetchCrmData()
      } else {
        toast({ variant: "destructive", title: "Erro na conexão", description: "Não foi possível conectar ao Facebook." })
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [fetchCrmData, fetchPages, toast])

  const copyToClipboard = (text: string, type: "url" | "token") => {
    navigator.clipboard.writeText(text)
    if (type === "url") { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000) }
    else { setCopiedToken(true); setTimeout(() => setCopiedToken(false), 2000) }
  }

  const handleConnectFacebook = () => {
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    setConnectingFb(true)
    const popup = window.open(
      "/api/facebook/auth",
      "facebook_oauth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )
    // Detecta fechamento manual do popup sem completar o fluxo
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer)
        setConnectingFb(false)
      }
    }, 500)
  }

  const handlePageSelect = async (connectionId: string) => {
    const page = pages.find((p) => p.id === connectionId)
    if (!page) return
    setFormData((prev) => ({ ...prev, connectionId, pageId: page.pageId, formId: "", formName: "" }))
    setForms([])
    setLoadingForms(true)
    try {
      const res = await fetch(`/api/facebook/forms?pageId=${page.pageId}`)
      const d = await res.json()
      if (res.ok) {
        setForms(d.forms ?? [])
        if ((d.forms ?? []).length === 0) {
          toast({ title: "Nenhum formulário encontrado", description: "Esta página não tem formulários Lead Ads ativos no Facebook." })
        }
      } else {
        toast({ variant: "destructive", title: "Erro ao buscar formulários", description: d.error ?? "Verifique as permissões da página." })
      }
    } finally {
      setLoadingForms(false)
    }
  }

  const handleFormSelect = async (formId: string) => {
    const form = forms.find((f) => f.id === formId)
    setFormData((prev) => ({ ...prev, formId, formName: form?.name ?? "" }))
    setFormQuestions([])
    setFieldMappings({})
    if (!formId || !formData.pageId) return
    setLoadingFields(true)
    try {
      const res = await fetch(`/api/facebook/form-fields?formId=${formId}&pageId=${formData.pageId}`)
      const d = await res.json()
      if (res.ok && d.questions?.length > 0) {
        setFormQuestions(d.questions)
        const autoMap: Record<string, string> = {}
        for (const q of d.questions) {
          autoMap[q.key] = AUTO_DETECT[q.type] ?? "observations"
        }
        setFieldMappings(autoMap)
      }
    } finally {
      setLoadingFields(false)
    }
  }

  const handleSave = async () => {
    if (!formData.connectionId || !formData.formId || !formData.funnelId || !formData.funnelStageId) {
      toast({ variant: "destructive", title: "Preencha todos os campos obrigatórios", description: "Página, Formulário, Funil e Etapa são obrigatórios." })
      return
    }
    setSavingMapping(true)
    try {
      const res = await fetch("/api/facebook/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, fieldMappings }),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      const { mapping, syncPending } = await res.json()
      toast({ title: "Mapeamento salvo!", description: `Formulário "${formData.formName}" mapeado com sucesso.` })
      setIsDialogOpen(false)
      setFormData(EMPTY_FORM)
      await fetchCrmData()
      if (syncPending) {
        toast({ title: "Sincronização iniciada", description: "Buscando leads históricos em segundo plano..." })
        fetch(`/api/facebook/sync/${mapping.id}`, { method: "POST" }).catch(() => null)
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar mapeamento" })
    } finally {
      setSavingMapping(false)
    }
  }

  const handleSync = async (mappingId: string) => {
    setSyncingId(mappingId)
    try {
      const res = await fetch(`/api/facebook/sync/${mappingId}`, { method: "POST" })
      const { imported, skipped } = await res.json()
      toast({ title: "Sincronização concluída", description: `${imported} leads importados, ${skipped} já existiam.` })
      await fetchCrmData()
    } catch {
      toast({ variant: "destructive", title: "Erro na sincronização" })
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este mapeamento?")) return
    await fetch(`/api/facebook/mappings/${id}`, { method: "DELETE" })
    toast({ title: "Mapeamento removido" })
    await fetchCrmData()
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground">Conecte fontes de leads ao seu CRM</p>
      </div>

      {/* Facebook Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Facebook Lead Ads</CardTitle>
                <CardDescription>Capture leads diretamente dos seus formulários do Facebook</CardDescription>
              </div>
            </div>
            <Button
              onClick={handleConnectFacebook}
              disabled={connectingFb}
              variant={pages.length > 0 ? "outline" : "default"}
              className={pages.length === 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            >
              {connectingFb
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Facebook className="h-4 w-4 mr-2" />}
              {pages.length > 0 ? "Reconectar" : "Conectar com Facebook"}
            </Button>
          </div>
        </CardHeader>
        {pages.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-2">
              {pages.map((p) => (
                <Badge key={p.id} variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {p.pageName}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{pages.length} página(s) conectada(s)</p>
          </CardContent>
        )}
      </Card>

      {/* Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mapeamentos de Formulários</CardTitle>
              <CardDescription>Vincule formulários do Facebook às regras de roteamento do CRM</CardDescription>
            </div>
            {pages.length > 0 && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Mapeamento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum mapeamento configurado</p>
              <p className="text-sm">Conecte o Facebook e adicione seu primeiro mapeamento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
                  <div className="space-y-1 flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{m.formName}</p>
                      <Badge variant={m.isActive ? "default" : "secondary"} className="text-xs">
                        {m.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      {m.leadCount > 0 && (
                        <Badge variant="outline" className="text-xs">{m.leadCount} leads</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Página: {m.connection.pageName}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {m.property && <Badge variant="outline" className="text-xs">{m.property.title}</Badge>}
                      {m.funnel && <Badge variant="outline" className="text-xs">{m.funnel.name}</Badge>}
                      {m.funnelStage && <Badge variant="outline" className="text-xs">{m.funnelStage.name}</Badge>}
                      {m.defaultBroker && <Badge variant="outline" className="text-xs">{m.defaultBroker.name}</Badge>}
                      {m.agencia && <Badge variant="outline" className="text-xs">{m.agencia}</Badge>}
                      {m.praca && <Badge variant="outline" className="text-xs">{m.praca}</Badge>}
                    </div>
                    {m.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground/60">
                        Última sync: {new Date(m.lastSyncedAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" disabled={syncingId === m.id} onClick={() => handleSync(m.id)}>
                      {syncingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Webhook</CardTitle>
          <CardDescription>
            Cole esses valores no Facebook Developer para receber leads em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside bg-muted/40 rounded-lg p-4 border border-border">
            <li>Acesse <strong className="text-foreground">developers.facebook.com</strong> → seu App → <em>Produtos → Webhooks</em></li>
            <li>Clique em <strong className="text-foreground">Adicionar assinatura</strong> e escolha o objeto <strong className="text-foreground">Page</strong></li>
            <li>Cole a <strong className="text-foreground">URL do Callback</strong> e o <strong className="text-foreground">Token de Verificação</strong> abaixo</li>
            <li>Assine o campo <code className="font-mono bg-muted px-1 rounded text-secondary-custom">leadgen</code></li>
            <li>O Facebook fará um GET automático para verificar — o sistema responde sozinho ✓</li>
          </ol>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">URL do Callback (Webhook)</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted/30" />
              <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => copyToClipboard(webhookUrl, "url")} title="Copiar URL">
                {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Token de Verificação</Label>
            <div className="flex gap-2">
              <Input readOnly value={verifyToken} className="font-mono text-xs bg-muted/30" />
              <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => copyToClipboard(verifyToken, "token")} title="Copiar Token">
                {copiedToken ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Salvo permanentemente no servidor via <code className="font-mono bg-muted px-1 rounded">FACEBOOK_WEBHOOK_VERIFY_TOKEN</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* New Mapping Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Mapeamento de Formulário</DialogTitle>
            <DialogDescription>Vincule um formulário do Facebook às regras de roteamento do CRM.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Página <span className="text-destructive">*</span></Label>
              <Select value={formData.connectionId} onValueChange={handlePageSelect} disabled={loadingPages}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingPages ? "Carregando..." : "Selecione uma página"} />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((p) => <SelectItem key={p.id} value={p.id}>{p.pageName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Formulário <span className="text-destructive">*</span></Label>
              <Select value={formData.formId} onValueChange={handleFormSelect} disabled={!formData.connectionId || loadingForms}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingForms ? "Carregando..." : !formData.connectionId ? "Selecione uma página primeiro" : "Selecione um formulário"} />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}{f.status !== "ACTIVE" && ` (${f.status})`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field Mapping */}
            {(loadingFields || formQuestions.length > 0) && (
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mapeamento de Campos
                </p>
                {loadingFields ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando campos do formulário...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formQuestions.map((q) => (
                      <div key={q.key} className="flex items-center gap-2">
                        <span className="text-xs text-foreground flex-1 min-w-0 truncate" title={q.label}>
                          {q.label}
                        </span>
                        <Select
                          value={fieldMappings[q.key] ?? "observations"}
                          onValueChange={(v) => setFieldMappings((prev) => ({ ...prev, [q.key]: v }))}
                        >
                          <SelectTrigger className="w-40 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CRM_TARGETS.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">
                      Campos marcados como "Observações" serão exibidos na ficha do lead no CRM.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roteamento CRM</p>

              <div className="space-y-1.5">
                <Label>Empreendimento</Label>
                <Select value={formData.propertyId || "__none__"} onValueChange={(v) => setFormData((p) => ({ ...p, propertyId: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Rodízio</Label>
                <Select value={formData.roletaId || "__none__"} onValueChange={(v) => setFormData((p) => ({ ...p, roletaId: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {roulettes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Funil <span className="text-destructive">*</span></Label>
                <Select value={formData.funnelId} onValueChange={(v) => setFormData((p) => ({ ...p, funnelId: v, funnelStageId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um funil" /></SelectTrigger>
                  <SelectContent>
                    {funnels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Etapa de Entrada <span className="text-destructive">*</span></Label>
                <Select value={formData.funnelStageId} onValueChange={(v) => setFormData((p) => ({ ...p, funnelStageId: v }))} disabled={!formData.funnelId}>
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.funnelId ? "Selecione um funil primeiro" : "Selecione uma etapa"} />
                  </SelectTrigger>
                  <SelectContent>
                    {funnelStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Corretor Padrão</Label>
                <Select value={formData.defaultBrokerId || "__none__"} onValueChange={(v) => setFormData((p) => ({ ...p, defaultBrokerId: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum (usa rodízio)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum (usa rodízio)</SelectItem>
                    {brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Agência</Label>
                  <Input placeholder="Nome da agência" value={formData.agencia} onChange={(e) => setFormData((p) => ({ ...p, agencia: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Praça</Label>
                  <Input placeholder="Ex: São Paulo" value={formData.praca} onChange={(e) => setFormData((p) => ({ ...p, praca: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <Checkbox id="syncLeads" checked={formData.syncLeads} onCheckedChange={(v) => setFormData((p) => ({ ...p, syncLeads: !!v }))} className="mt-0.5" />
              <div>
                <label htmlFor="syncLeads" className="text-sm font-medium cursor-pointer">Sincronizar leads já existentes da campanha</label>
                <p className="text-xs text-muted-foreground mt-0.5">Importa em segundo plano todos os leads históricos deste formulário ao salvar.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={savingMapping}>
              {savingMapping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
