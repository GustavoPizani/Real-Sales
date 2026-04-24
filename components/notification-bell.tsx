"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"
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
}

export function NotificationBell({ variant = "header" }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
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
          // Browser notification if page is in background
          if (document.hidden && Notification.permission === 'granted') {
            new Notification(n.title, { body: n.body, icon: '/icons/icon-192.png' })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchNotifications])

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [unreadCount])

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) markAllRead()
  }

  const handleNotifClick = (n: AppNotification) => {
    if (n.data?.clientId) {
      setOpen(false)
      router.push(`/client/${n.data.clientId}`)
    }
  }

  const isHeader = variant === "header"

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            isHeader
              ? "text-white hover:bg-white/20 hover:text-white h-8 w-8"
              : "h-9 w-9 text-muted-foreground hover:text-foreground"
          )}
          title="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={cn(
                  "px-4 py-3 border-b last:border-0 transition-colors flex items-start gap-3",
                  !n.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
                  n.data?.clientId && "cursor-pointer hover:bg-muted/50"
                )}
              >
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
                <div className={cn("flex-1 min-w-0", n.isRead && "ml-5")}>
                  <p className="text-sm font-medium leading-snug truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {format(new Date(n.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
