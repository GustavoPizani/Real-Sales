"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  Settings,
  TrendingUp,
  Menu,
  X,
  RotateCcw,
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pipeline", href: "/pipeline", icon: TrendingUp },
  { name: "Imóveis", href: "/properties", icon: Building2 },
  { name: "Tarefas", href: "/tasks", icon: CheckSquare },
  { name: "Usuários", href: "/users", icon: Users },
  { name: "ADS", href: "/ads", icon: Megaphone },
  { name: "Roleta", href: "/roleta", icon: RotateCcw },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md bg-primary-custom text-white shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:w-16 lg:hover:w-64 lg:transition-all lg:duration-300 group",
          "sidebar-custom shadow-custom-lg",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center px-4 lg:px-2 border-b border-white border-opacity-20">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-custom">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity lg:duration-300">
                RealSales CRM
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    isActive
                      ? "bg-secondary-custom text-white shadow-md"
                      : "text-gray-200 hover:bg-white hover:bg-opacity-10 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200",
                      isActive ? "text-white" : "text-gray-300 group-hover:text-white",
                    )}
                  />
                  <span className="lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity lg:duration-300">
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-white border-opacity-20 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-custom">
                <span className="text-sm font-medium text-white">JD</span>
              </div>
              <div className="lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity lg:duration-300">
                <p className="text-sm font-medium text-white">João Diretor</p>
                <p className="text-xs text-gray-300">Administrador</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
