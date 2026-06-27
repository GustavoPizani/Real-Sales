"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Zap, SlidersHorizontal, Bell, LogOut, X, ArrowLeft, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const marketingNav = [
  { name: "Dashboard", href: "/marketing", icon: LayoutDashboard, exact: true },
  { name: "Integrações", href: "/marketing/integrations", icon: Zap, exact: false },
  { name: "Config. Dashboard", href: "/marketing/settings", icon: SlidersHorizontal, exact: false },
  { name: "WhatsApp", href: "/marketing/whatsapp", icon: MessageCircle, exact: false },
  { name: "Configuração Slack", href: "/marketing/slack", icon: Bell, exact: false },
]

interface MarketingNavigationProps {
  isMobileOpen: boolean
  setIsMobileOpen: (v: boolean) => void
}

export function MarketingNavigation({ isMobileOpen, setIsMobileOpen }: MarketingNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false)

  const isExpanded = isDesktopExpanded || isMobileOpen

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "sidebar-custom text-[var(--text-secondary)] h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          "lg:translate-x-0 overflow-y-auto overflow-x-hidden",
          isDesktopExpanded ? "lg:w-64" : "lg:w-16"
        )}
        onMouseEnter={() => !isMobileOpen && setIsDesktopExpanded(true)}
        onMouseLeave={() => !isMobileOpen && setIsDesktopExpanded(false)}
      >
        {/* Header */}
        <div className="p-4 flex-shrink-0 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/nordic-logo.svg" alt="Nordic CRM" className="w-8 h-8 flex-shrink-0" />
            <div className={cn(
              "flex flex-col transition-opacity duration-200 whitespace-nowrap",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              <span className="text-base font-semibold leading-tight text-[var(--text-primary)]">Nordic</span>
              <span className="text-xs font-semibold text-[var(--accent-primary)]">
                Marketing
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-[var(--text-secondary)]" onClick={() => setIsMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav Items */}
        <nav className="flex-grow px-2 py-4">
          <ul className="space-y-1">
            {marketingNav.map((item) => {
              const Icon = item.icon
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => isMobileOpen && setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center py-[10px] px-4 text-sm font-medium rounded-md transition-all duration-200 border-l-2",
                      isActive
                        ? "text-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-glow)]"
                        : "text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className={cn(
                      "ml-3 whitespace-nowrap transition-opacity duration-200",
                      isExpanded ? "opacity-100" : "opacity-0"
                    )}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[var(--border-subtle)] flex-shrink-0 space-y-2">
          {/* Back to CRM */}
          <Link
            href="/dashboard"
            onClick={() => isMobileOpen && setIsMobileOpen(false)}
            className={cn(
              "flex items-center py-[10px] px-4 text-sm font-semibold rounded-md border transition-all duration-200",
              "border-[var(--border-accent)] text-[var(--accent-primary)] hover:bg-[var(--accent-glow)] hover:border-[var(--border-strong)]"
            )}
          >
            <ArrowLeft className="h-5 w-5 flex-shrink-0" />
            <span className={cn(
              "ml-3 whitespace-nowrap transition-opacity duration-200",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              Acessar CRM
            </span>
          </Link>

          {/* User */}
          <div className="flex items-center min-w-0 px-1 py-1">
            <div className="w-8 h-8 bg-[var(--accent-glow)] rounded-full flex items-center justify-center flex-shrink-0 border border-[var(--border-accent)]">
              <span className="text-sm font-semibold text-[var(--accent-primary)]">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={cn(
              "ml-3 min-w-0 flex-1 transition-opacity duration-200 whitespace-nowrap",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              <p className="text-sm font-semibold truncate leading-tight text-[var(--text-primary)]">{user?.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">Marketing</p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors",
              isExpanded ? "justify-start" : "justify-center"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={cn("ml-3", !isExpanded && "hidden")}>Sair</span>
          </Button>
        </div>
      </aside>
    </>
  )
}
