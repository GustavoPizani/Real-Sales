"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Bell, CheckSquare, RefreshCw, Trash2, UserPlus, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { differenceInCalendarDays, format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface AppNotification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
  data?: { clientId?: string } & Record<string, any>
}

interface Props {
  variant?: "sidebar" | "header"
  /** Para onde o painel abre: abaixo do sino (cabeçalho) ou à direita dele (menu lateral). */
  placement?: "bottom" | "right"
}

const GROUPS = ["Hoje", "Ontem", "Esta semana", "Anteriores"] as const

/**
 * O que chega pelo tempo real do Supabase vem como horário UTC sem o "Z";
 * sem isso o navegador lê como horário local e a notificação aparece 3h adiantada.
 */
function parseDate(value: string) {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`)
}

function groupOf(date: Date): (typeof GROUPS)[number] {
  const days = differenceInCalendarDays(new Date(), date)
  if (days <= 0) return "Hoje"
  if (days === 1) return "Ontem"
  if (days < 7) return "Esta semana"
  return "Anteriores"
}

function iconOf(type: string): LucideIcon {
  const t = type.toUpperCase()
  if (t.includes("TASK")) return CheckSquare
  if (t.includes("LEAD") || t.includes("RECADASTRO")) return UserPlus
  return Bell
}

// Os títulos são gravados com um emoji na frente; aqui o ícone já faz esse papel.
const cleanTitle = (title: string) => title.replace(/^[^A-Za-z0-9À-ÿ]+/, "")

export function NotificationBell({ variant = "header", placement = "bottom" }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [hasError, setHasError] = useState(false)
  // "Limpar tudo" apaga de vez, então pede uma confirmação no próprio painel.
  const [confirmClear, setConfirmClear] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
      setHasError(false)
    } catch {
      setHasError(true)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    const supabase = createClient()
    const channel = supabase
      .channel(`notif_${user.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${user.id}`,
        },
        (payload: any) => {
          const n = payload.new as AppNotification
          setNotifications(prev => [n, ...prev.slice(0, 49)])
          setUnreadCount(prev => prev + 1)
          // Aviso do navegador com a página em segundo plano. Nem todo navegador
          // tem essa API (iPhone fora do app instalado), por isso a checagem.
          if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(cleanTitle(n.title), { body: n.body, icon: '/icons/icon-192.png' })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchNotifications])

  const markAllRead = async () => {
    if (unreadCount === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => null)
  }

  const clearAll = async () => {
    const previous = notifications
    const previousUnread = unreadCount
    setNotifications([])
    setUnreadCount(0)
    setConfirmClear(false)
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      // Não apagou no servidor: devolve a lista para a tela não mentir.
      setNotifications(previous)
      setUnreadCount(previousUnread)
      setHasError(true)
    }
  }

  // Abrir o painel não marca nada: só o clique na notificação ou "Marcar todas".
  const handleNotifClick = (n: AppNotification) => {
    if (!n.isRead) {
      setNotifications(prev => prev.map(item => (item.id === n.id ? { ...item, isRead: true } : item)))
      setUnreadCount(prev => Math.max(prev - 1, 0))
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => null)
    }
    if (n.data?.clientId) {
      setOpen(false)
      router.push(`/client/${n.data.clientId}`)
    }
  }

  const grouped = useMemo(() => {
    const byGroup = new Map<string, (AppNotification & { date: Date })[]>()
    for (const n of notifications) {
      const date = parseDate(n.createdAt)
      const group = groupOf(date)
      if (!byGroup.has(group)) byGroup.set(group, [])
      byGroup.get(group)!.push({ ...n, date })
    }
    return GROUPS.filter(g => byGroup.has(g)).map(g => ({ label: g, items: byGroup.get(g)! }))
  }, [notifications])

  const isHeader = variant === "header"
  const bellLabel = unreadCount > 0
    ? `Notificações: ${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
    : "Notificações"

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmClear(false) }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={bellLabel}
          title="Notificações"
          className={cn(
            "relative h-10 w-10",
            isHeader
              ? "text-white hover:bg-white/20 hover:text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0"
        side={placement}
        align="end"
        sideOffset={placement === "right" ? 16 : 8}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {unreadCount > 0 ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}` : "Tudo lido"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 rounded-full text-xs" onClick={markAllRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
          {hasError && notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Não foi possível carregar as notificações.</p>
              <Button variant="outline" size="sm" className="rounded-full" onClick={fetchNotifications}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Tentar de novo
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
              <p className="mt-1 text-xs text-muted-foreground">Novos leads e tarefas aparecem neste painel.</p>
            </div>
          ) : (
            grouped.map(group => (
              <section key={group.label} aria-label={group.label}>
                <h4 className="bg-muted/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h4>
                <ul>
                  {group.items.map(n => {
                    const Icon = iconOf(n.type)
                    return (
                      <li key={n.id} className="border-b last:border-0">
                        <button
                          type="button"
                          onClick={() => handleNotifClick(n)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                            !n.isRead && "bg-[var(--accent-glow)]"
                          )}
                        >
                          <span className={cn(
                            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
                            n.isRead ? "bg-muted text-muted-foreground" : "bg-[var(--accent-primary)] text-[#07090D]"
                          )}>
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-sm leading-snug text-foreground", n.isRead ? "font-normal" : "font-semibold")}>
                              {cleanTitle(n.title)}
                            </span>
                            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground line-clamp-2">{n.body}</span>
                            <span className="mt-1 block text-xs text-muted-foreground" title={format(n.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>
                              {formatDistanceToNow(n.date, { addSuffix: true, locale: ptBR })}
                            </span>
                          </span>
                          {!n.isRead && (
                            <>
                              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--secondary-custom-text)]" aria-hidden="true" />
                              <span className="sr-only">Não lida</span>
                            </>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
            {confirmClear ? (
              <>
                <p className="text-xs text-foreground" role="alert">Apagar todas as notificações?</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-9 rounded-full text-xs" onClick={() => setConfirmClear(false)}>Cancelar</Button>
                  <Button variant="destructive" size="sm" className="h-9 rounded-full text-xs" onClick={clearAll}>Apagar</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {notifications.length >= 50 ? "Mostrando as 50 mais recentes." : `${notifications.length} no total`}
                </p>
                <Button variant="ghost" size="sm" className="h-9 rounded-full text-xs" onClick={() => setConfirmClear(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Limpar tudo
                </Button>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
