"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Bell, CheckCircle2, AlertCircle, Save, Loader2, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"

interface SlackUser {
  id: string
  name: string
  email: string
  role: string
  slackMemberId: string | null
}

const ROLE_LABELS: Record<string, string> = {
  MARKETING_ADMIN: "Marketing / Admin",
  DIRECTOR: "Diretor",
  MANAGER: "Gerente",
  BROKER: "Corretor",
}

const DEFAULT_MESSAGE = "Olá {{nome}}! 👋 Sou {{corretor}} da Real Sales.\nVi que você se interessou pelo {{produto}} e gostaria de te apresentar mais detalhes. Posso te ajudar?"

export default function SlackConfigPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<SlackUser[]>([])
  const [slackIds, setSlackIds] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [firstMessage, setFirstMessage] = useState("")
  const [savingMsg, setSavingMsg] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [slackStatus, setSlackStatus] = useState({ webhookConfigured: false, botTokenConfigured: false })
  const msgRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (variable: string) => {
    const el = msgRef.current
    if (!el) return
    const start = el.selectionStart ?? firstMessage.length
    const end = el.selectionEnd ?? firstMessage.length
    const updated = firstMessage.slice(0, start) + variable + firstMessage.slice(end)
    setFirstMessage(updated)
    // Reposiciona o cursor após a variável inserida
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + variable.length, start + variable.length)
    })
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users/slack")
      if (!res.ok) throw new Error("Falha ao carregar usuários")
      const { users: data } = await res.json()
      setUsers(data)
      const ids: Record<string, string> = {}
      data.forEach((u: SlackUser) => { ids[u.id] = u.slackMemberId ?? "" })
      setSlackIds(ids)
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUsers()
    // Verifica status das variáveis de ambiente via API (server-side)
    fetch("/api/marketing/slack-status")
      .then(r => r.json())
      .then(setSlackStatus)
      .catch(() => {})
    // Carrega userId e mensagem de primeiro contato
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from("api_settings")
        .select("encrypted_value")
        .eq("user_id", user.id)
        .eq("setting_key", "WHATSAPP_FIRST_MESSAGE")
        .maybeSingle()
        .then(({ data }) => {
          setFirstMessage(data?.encrypted_value ?? "")
        })
    })
  }, [loadUsers])

  const saveFirstMessage = async () => {
    if (!userId) return
    setSavingMsg(true)
    try {
      const { data: existing } = await supabase
        .from("api_settings")
        .select("id")
        .eq("user_id", userId)
        .eq("setting_key", "WHATSAPP_FIRST_MESSAGE")
        .maybeSingle()

      const { error } = existing
        ? await supabase.from("api_settings").update({ encrypted_value: firstMessage }).eq("user_id", userId).eq("setting_key", "WHATSAPP_FIRST_MESSAGE")
        : await supabase.from("api_settings").insert({ user_id: userId, setting_key: "WHATSAPP_FIRST_MESSAGE", encrypted_value: firstMessage })

      if (error) throw error
      toast({ title: "Mensagem salva!", description: "Será usada no botão WhatsApp das notificações." })
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" })
    } finally {
      setSavingMsg(false)
    }
  }

  const save = async (userId: string) => {
    setSaving(userId)
    try {
      const res = await fetch("/api/users/slack", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, slackMemberId: slackIds[userId] || null }),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      toast({ title: "Salvo", description: "Slack Member ID atualizado." })
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" })
    } finally {
      setSaving(null) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-6 h-6 text-secondary-custom" />
          Configuração Slack
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie as notificações de leads enviadas pelo Slack para cada corretor.
        </p>
      </div>

      {/* Status das variáveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status da Integração</CardTitle>
          <CardDescription>
            As chaves abaixo são configuradas nas variáveis de ambiente da Vercel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusRow
            label="Canal geral (SLACK_LEAD_WEBHOOK_URL)"
            description="Todas as notificações de leads vão para este canal"
            ok={slackStatus.webhookConfigured}
            okText="Configurado"
            failText="Adicionar na Vercel → SLACK_LEAD_WEBHOOK_URL"
          />
          <StatusRow
            label="Bot Token (SLACK_BOT_TOKEN)"
            description="Necessário para enviar DMs diretas aos corretores"
            ok={slackStatus.botTokenConfigured}
            okText="Configurado"
            failText="Adicionar na Vercel → SLACK_BOT_TOKEN (scope: chat:write)"
            warn
          />
        </CardContent>
      </Card>

      {/* Mensagem de Primeiro Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-secondary-custom" />
            Mensagem de Primeiro Contato (WhatsApp)
          </CardTitle>
          <CardDescription>
            Texto pré-preenchido no botão <strong>💬 Enviar no WhatsApp</strong> das notificações do Slack.
            Use as variáveis: <code className="bg-muted px-1 rounded text-xs">{`{{nome}}`}</code> (lead),{" "}
            <code className="bg-muted px-1 rounded text-xs">{`{{produto}}`}</code> (imóvel),{" "}
            <code className="bg-muted px-1 rounded text-xs">{`{{corretor}}`}</code> (corretor).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Botões de inserção de variável */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "{{nome}}", desc: "Lead" },
              { label: "{{produto}}", desc: "Imóvel" },
              { label: "{{corretor}}", desc: "Corretor" },
            ].map(({ label, desc }) => (
              <button
                key={label}
                type="button"
                onClick={() => insertVariable(label)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-secondary-custom/40 bg-secondary-custom/10 text-secondary-custom text-xs font-mono font-semibold hover:bg-secondary-custom/20 transition-colors"
              >
                <span>{label}</span>
                <span className="text-secondary-custom/60 font-sans font-normal">{desc}</span>
              </button>
            ))}
          </div>

          <textarea
            ref={msgRef}
            className="w-full min-h-[110px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder={DEFAULT_MESSAGE}
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              O corretor só precisa clicar em Enviar — mensagem já vem preenchida no WhatsApp Web.
            </p>
            <Button
              onClick={saveFirstMessage}
              disabled={savingMsg}
              size="sm"
              className="bg-secondary-custom hover:bg-secondary-custom/90 text-primary-custom font-bold"
            >
              {savingMsg ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Mensagem
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Slack Member ID por corretor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Slack Member ID por Corretor</CardTitle>
          <CardDescription>
            Quando um lead é atribuído, o corretor recebe uma DM direta no Slack além do canal geral.
            Para encontrar o Member ID: clique no perfil do usuário no Slack → <code className="text-xs bg-muted px-1 rounded">···</code> → <strong>Copy member ID</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando usuários...</span>
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                      {u.slackMemberId && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* Input */}
                  <Input
                    value={slackIds[u.id] ?? ""}
                    onChange={(e) => setSlackIds((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    placeholder="U0123456789"
                    className="w-40 h-9 font-mono text-sm"
                  />

                  {/* Save */}
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 flex-shrink-0"
                    disabled={saving === u.id}
                    onClick={() => save(u.id)}
                  >
                    {saving === u.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Save className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como configurar o Bot Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Acesse <strong>api.slack.com/apps</strong> → selecione o app Real Sales</p>
          <p>2. Em <strong>OAuth & Permissions</strong>, adicione o scope <code className="bg-muted px-1 rounded">chat:write</code></p>
          <p>3. Clique em <strong>Install to Workspace</strong> e autorize</p>
          <p>4. Copie o <strong>Bot User OAuth Token</strong> (começa com <code className="bg-muted px-1 rounded">xoxb-</code>)</p>
          <p>5. Adicione na Vercel como variável de ambiente <code className="bg-muted px-1 rounded">SLACK_BOT_TOKEN</code></p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusRow({
  label,
  description,
  ok,
  okText,
  failText,
  warn = false,
}: {
  label: string
  description: string
  ok: boolean
  okText: string
  failText: string
  warn?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {!ok && (
          <p className="text-xs text-amber-500 mt-1">{failText}</p>
        )}
      </div>
      {ok ? (
        <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4" /> {okText}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-amber-500 text-xs font-semibold whitespace-nowrap">
          <AlertCircle className="w-4 h-4" /> {warn ? "Opcional" : "Pendente"}
        </span>
      )}
    </div>
  )
}
