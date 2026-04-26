"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  Facebook,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Zap,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

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

export default function SocialSettingsPage() {
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
  const [formsError, setFormsError] = useState('')
  const [savingMapping, setSavingMapping] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [formData, setFormData] = useState(EMPTY_FORM)

  const selectedFunnel = funnels.find(f => f.id === formData.funnelId)
  const funnelStages = selectedFunnel?.stages ?? []

  const fetchCrmData = useCallback(async () => {
    const [fRes, pRes, rRes, uRes, mRes] = await Promise.all([
      fetch("/api/funnels"),
      fetch("/api/properties"),
      fetch("/api/roletas"),
      fetch("/api/users"),
      fetch("/api/facebook/mappings"),
    ])
    if (fRes.ok) {
      const d = await fRes.json()
      setFunnels(d.funnels ?? [])
    }
    if (pRes.ok) {
      const d = await pRes.json()
      setProperties(Array.isArray(d) ? d : d.properties ?? [])
    }
    if (rRes.ok) {
      const d = await rRes.json()
      setRoulettes(Array.isArray(d) ? d : d.roulettes ?? [])
    }
    if (uRes.ok) {
      const d = await uRes.json()
      setBrokers(d.users ?? [])
    }
    if (mRes.ok) {
      const d = await mRes.json()
      setMappings(d.mappings ?? [])
    }
  }, [])

  const fetchPages = useCallback(async () => {
    setLoadingPages(true)
    try {
      const res = await fetch("/api/facebook/pages")
      if (res.ok) {
        const d = await res.json()
        setPages(d.pages ?? [])
      }
    } finally {
      setLoadingPages(false)
    }
  }, [])

  useEffect(() => {
    fetchCrmData()
    fetchPages()

    const params = new URLSearchParams(window.location.search)
    if (params.get("fb_success"))
      toast({
        title: "Facebook conectado!",
        description: "Páginas sincronizadas com sucesso.",
      })
    if (params.get("fb_error"))
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: "Não foi possível conectar ao Facebook.",
      })
  }, [fetchCrmData, fetchPages, toast])

  const handlePageSelect = async (connectionId: string) => {
    const page = pages.find(p => p.id === connectionId)
    if (!page) return
    setFormData(prev => ({
      ...prev,
      connectionId,
      pageId: page.pageId,
      formId: "",
      formName: "",
    }))
    setLoadingForms(true)
    setFormsError('')
    try {
      const res = await fetch(`/api/facebook/forms?pageId=${page.pageId}`)
      const d = await res.json()
      if (res.ok) {
        setForms(d.forms ?? [])
        if ((d.forms ?? []).length === 0) {
          setFormsError('Nenhum formulário ativo encontrado nesta página.')
        }
      } else {
        const msg: string = d.error ?? ''
        const isExpired = msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')
        setFormsError(
          isExpired
            ? 'Token do Facebook expirado. Clique em "Reconectar" para renovar o acesso.'
            : `Erro ao carregar formulários: ${msg || 'Reconecte sua conta Facebook.'}`
        )
      }
    } catch {
      setFormsError('Erro de conexão. Verifique sua internet.')
    } finally {
      setLoadingForms(false)
    }
  }

  const handleFormSelect = (formId: string) => {
    const form = forms.find(f => f.id === formId)
    setFormData(prev => ({ ...prev, formId, formName: form?.name ?? "" }))
  }

  const handleSave = async () => {
    if (
      !formData.connectionId ||
      !formData.formId ||
      !formData.funnelId ||
      !formData.funnelStageId
    ) {
      toast({
        variant: "destructive",
        title: "Preencha todos os campos obrigatórios",
        description: "Página, Formulário, Funil e Etapa são obrigatórios.",
      })
      return
    }
    setSavingMapping(true)
    try {
      const res = await fetch("/api/facebook/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      const { mapping, syncPending } = await res.json()
      toast({
        title: "Mapeamento salvo!",
        description: `Formulário "${formData.formName}" mapeado com sucesso.`,
      })
      setIsDialogOpen(false)
      setFormData(EMPTY_FORM)
      await fetchCrmData()

      if (syncPending) {
        toast({
          title: "Sincronização iniciada",
          description: "Buscando leads históricos em segundo plano...",
        })
        fetch(`/api/facebook/sync/${mapping.id}`, { method: "POST" }).catch(
          () => null
        )
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar mapeamento" })
    } finally {
      setSavingMapping(false)
    }
  }

  const handleSync = async (mappingId: string, formName: string) => {
    setSyncingId(mappingId)
    try {
      const res = await fetch(`/api/facebook/sync/${mappingId}`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ variant: "destructive", title: "Erro na sincronização", description: json.error || "Verifique o token do Facebook." })
        return
      }
      const { imported, skipped, errors } = json
      toast({
        title: "Sincronização concluída",
        description: errors
          ? `${imported} importados, ${skipped} já existiam, ${errors} erros.`
          : `${imported} leads importados, ${skipped} já existiam.`,
      })
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
        <p className="text-muted-foreground">
          Conecte fontes de leads ao seu CRM
        </p>
      </div>

      {/* Facebook Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Facebook Lead Ads</CardTitle>
                <CardDescription>
                  Capture leads diretamente dos seus formulários do Facebook
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              variant={pages.length > 0 ? "outline" : "default"}
              className={
                pages.length === 0
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : ""
              }
            >
              <a href="/api/facebook/auth">
                <Facebook className="h-4 w-4 mr-2" />
                {pages.length > 0 ? "Reconectar" : "Conectar com Facebook"}
              </a>
            </Button>
          </div>
        </CardHeader>

        {pages.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {pages.map(p => (
                <Badge
                  key={p.id}
                  variant="secondary"
                  className="flex items-center gap-1.5 py-1 px-3"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {p.pageName}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {pages.length} página(s) conectada(s)
            </p>
          </CardContent>
        )}
      </Card>

      {/* Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mapeamentos de Formulários</CardTitle>
              <CardDescription>
                Vincule formulários do Facebook às regras de roteamento do CRM
              </CardDescription>
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
              <p className="text-sm">
                Conecte o Facebook e adicione seu primeiro mapeamento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 border border-border rounded-xl bg-card"
                >
                  <div className="space-y-1 flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">
                        {m.formName}
                      </p>
                      <Badge
                        variant={m.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {m.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      {m.leadCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {m.leadCount} leads
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Página: {m.connection.pageName}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {m.property && (
                        <Badge variant="outline" className="text-xs">
                          {m.property.title}
                        </Badge>
                      )}
                      {m.funnel && (
                        <Badge variant="outline" className="text-xs">
                          {m.funnel.name}
                        </Badge>
                      )}
                      {m.funnelStage && (
                        <Badge variant="outline" className="text-xs">
                          {m.funnelStage.name}
                        </Badge>
                      )}
                      {m.defaultBroker && (
                        <Badge variant="outline" className="text-xs">
                          {m.defaultBroker.name}
                        </Badge>
                      )}
                      {m.agencia && (
                        <Badge variant="outline" className="text-xs">
                          {m.agencia}
                        </Badge>
                      )}
                      {m.praca && (
                        <Badge variant="outline" className="text-xs">
                          {m.praca}
                        </Badge>
                      )}
                    </div>
                    {m.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground/60">
                        Última sync:{" "}
                        {new Date(m.lastSyncedAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={syncingId === m.id}
                      onClick={() => handleSync(m.id, m.formName)}
                    >
                      {syncingId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuração do Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">
              URL do Webhook (configure no Facebook Developer)
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                readOnly
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/api/webhooks/facebook`
                    : "/api/webhooks/facebook"
                }
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Verify Token (variável FACEBOOK_WEBHOOK_VERIFY_TOKEN)
            </Label>
            <Input
              readOnly
              value="••••••••••••••••"
              className="font-mono text-xs"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Configure esses valores no painel do Facebook Developer → Webhooks →
            Assinar para o campo{" "}
            <code className="font-mono bg-muted px-1 rounded">leadgen</code>.
          </p>
        </CardContent>
      </Card>

      {/* New Mapping Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Mapeamento de Formulário</DialogTitle>
            <DialogDescription>
              Vincule um formulário do Facebook às regras de roteamento do CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Página */}
            <div className="space-y-1.5">
              <Label>
                Página <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.connectionId}
                onValueChange={handlePageSelect}
                disabled={loadingPages}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingPages ? "Carregando..." : "Selecione uma página"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {pages.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.pageName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formulário */}
            <div className="space-y-1.5">
              <Label>
                Formulário <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.formId}
                onValueChange={handleFormSelect}
                disabled={!formData.connectionId || loadingForms}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingForms
                        ? "Carregando..."
                        : !formData.connectionId
                          ? "Selecione uma página primeiro"
                          : "Selecione um formulário"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {forms.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                      {f.status !== "ACTIVE" && ` (${f.status})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formsError && (
                <p className="text-xs text-destructive mt-1">{formsError}</p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Roteamento CRM
              </p>

              {/* Empreendimento */}
              <div className="space-y-1.5 mb-3">
                <Label>Empreendimento</Label>
                <Select
                  value={formData.propertyId}
                  onValueChange={v =>
                    setFormData(p => ({ ...p, propertyId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rodízio */}
              <div className="space-y-1.5 mb-3">
                <Label>Rodízio</Label>
                <Select
                  value={formData.roletaId}
                  onValueChange={v =>
                    setFormData(p => ({ ...p, roletaId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {roulettes.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Funil */}
              <div className="space-y-1.5 mb-3">
                <Label>
                  Funil <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.funnelId}
                  onValueChange={v =>
                    setFormData(p => ({ ...p, funnelId: v, funnelStageId: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funil" />
                  </SelectTrigger>
                  <SelectContent>
                    {funnels.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Etapa do Funil */}
              <div className="space-y-1.5 mb-3">
                <Label>
                  Etapa de Entrada <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.funnelStageId}
                  onValueChange={v =>
                    setFormData(p => ({ ...p, funnelStageId: v }))
                  }
                  disabled={!formData.funnelId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !formData.funnelId
                          ? "Selecione um funil primeiro"
                          : "Selecione uma etapa"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {funnelStages.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Corretor Padrão */}
              <div className="space-y-1.5 mb-3">
                <Label>Corretor Padrão</Label>
                <Select
                  value={formData.defaultBrokerId}
                  onValueChange={v =>
                    setFormData(p => ({ ...p, defaultBrokerId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum (usa rodízio)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum (usa rodízio)</SelectItem>
                    {brokers.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agência e Praça */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5">
                  <Label>Agência</Label>
                  <Input
                    placeholder="Nome da agência"
                    value={formData.agencia}
                    onChange={e =>
                      setFormData(p => ({ ...p, agencia: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Praça</Label>
                  <Input
                    placeholder="Ex: São Paulo"
                    value={formData.praca}
                    onChange={e =>
                      setFormData(p => ({ ...p, praca: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Backfill checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <Checkbox
                id="syncLeads"
                checked={formData.syncLeads}
                onCheckedChange={v =>
                  setFormData(p => ({ ...p, syncLeads: !!v }))
                }
                className="mt-0.5"
              />
              <div>
                <label
                  htmlFor="syncLeads"
                  className="text-sm font-medium cursor-pointer"
                >
                  Sincronizar leads já existentes da campanha
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Importa em segundo plano todos os leads históricos deste
                  formulário ao salvar.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={savingMapping}>
              {savingMapping && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar Mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
