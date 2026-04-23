"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Zap, SlidersHorizontal, LogOut, X, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const marketingNav = [
  { name: "Dashboard", href: "/marketing", icon: LayoutDashboard, exact: true },
  { name: "Integrações", href: "/marketing/integrations", icon: Zap, exact: false },
  { name: "Config. Dashboard", href: "/marketing/settings", icon: SlidersHorizontal, exact: false },
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "sidebar-custom text-white h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          "lg:translate-x-0 overflow-y-auto overflow-x-hidden",
          isDesktopExpanded ? "lg:w-64" : "lg:w-16"
        )}
        onMouseEnter={() => !isMobileOpen && setIsDesktopExpanded(true)}
        onMouseLeave={() => !isMobileOpen && setIsDesktopExpanded(false)}
      >
        {/* Header */}
        <div className="p-4 flex-shrink-0 border-b border-tertiary-custom/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Real Sales Logo" className="w-8 h-8 flex-shrink-0" />
            <div className={cn(
              "flex flex-col transition-opacity duration-200 whitespace-nowrap",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              <span className="text-base font-extrabold leading-tight text-white">Real Sales</span>
              <span className="text-xs font-bold" style={{ color: "var(--secondary-custom)" }}>
                Marketing
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setIsMobileOpen(false)}>
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
                      "flex items-center p-3 text-sm font-medium rounded-lg transition-all duration-200 border-l-4",
                      isActive
                        ? "text-secondary-custom border-secondary-custom bg-white/[0.06]"
                        : "text-gray-200 border-transparent hover:bg-tertiary-custom/60 hover:text-white"
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
        <div className="p-3 border-t border-tertiary-custom/50 flex-shrink-0 space-y-2">
          {/* Back to CRM */}
          <Link
            href="/dashboard"
            onClick={() => isMobileOpen && setIsMobileOpen(false)}
            className={cn(
              "flex items-center p-3 text-sm font-semibold rounded-lg border transition-all duration-200",
              "border-secondary-custom/50 text-secondary-custom hover:bg-secondary-custom/10"
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
            <div className="w-8 h-8 bg-tertiary-custom rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={cn(
              "ml-3 min-w-0 flex-1 transition-opacity duration-200 whitespace-nowrap",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">Marketing</p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-gray-300 hover:bg-tertiary-custom/60 hover:text-white transition-colors",
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
