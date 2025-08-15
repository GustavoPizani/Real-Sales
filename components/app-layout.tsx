"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { Navigation } from "./navigation"
import { usePathname } from "next/navigation"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Don't show layout on login page
  if (pathname === "/login") {
    return <>{children}</>
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main Content */}
      <div className="lg:ml-16 transition-all duration-300">
        <main className="min-h-screen">
          <div className="pt-16 lg:pt-0">{children}</div>
        </main>
      </div>
    </div>
  )
}
