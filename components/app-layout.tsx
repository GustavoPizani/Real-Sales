// components/app-layout.tsx
"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "./navigation";
import { MobileHeader } from "./mobile-header";
import { NotificationBell } from "./notification-bell";
import { usePathname } from "next/navigation";
import { useMobileHeader } from "@/contexts/mobile-header-context";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { actionButton } = useMobileHeader();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom"></div>
      </div>
    );
  }

  if (!user) {
    // Idealmente, isto seria tratado por um redirect no auth-context ou middleware
    // Mas, por segurança, retornamos null para não mostrar o layout
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Componente de Navegação (Sidebar) */}
      <Navigation isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />

      <MobileHeader
        onMenuClick={() => setIsMobileMenuOpen(true)}
        actionButton={actionButton}
      />
      
      {/* Conteúdo Principal com espaçamento ajustado */}
      <div className="pt-16 lg:pt-0 lg:ml-16 transition-all duration-300">
        {/* Barra superior desktop com sino de notificações */}
        <div className="hidden lg:flex items-center justify-end px-6 py-2 border-b bg-card/50">
          <NotificationBell variant="sidebar" />
        </div>
        <main className="min-h-screen">
          <div>{children}</div>
        </main>
      </div>
    </div>
  );
}