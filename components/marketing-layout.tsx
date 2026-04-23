"use client"

import React, { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { MarketingNavigation } from "./marketing-navigation"
import { Menu } from "lucide-react"

interface MarketingLayoutProps {
  children: React.ReactNode
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const { user, isLoading } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-custom" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <MarketingNavigation
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-4 gap-3 bg-background/95 backdrop-blur border-b border-border">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-bold text-secondary-custom text-sm tracking-wide">Marketing</span>
      </header>

      {/* Main content */}
      <div className="pt-14 lg:pt-0 lg:ml-16 transition-all duration-300">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
