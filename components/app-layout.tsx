// components/app-layout.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "./navigation";
import { MobileHeader } from "./mobile-header";
import { usePathname, useRouter } from "next/navigation";
import { useMobileHeader } from "@/contexts/mobile-header-context";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { sidebarContentMargin } from "./app-sidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { actionButton } = useMobileHeader();
  const [sidebarCollapsed] = useSidebarCollapsed();

  // Sem sessão ativa — manda direto pro login em vez de deixar a tela em branco
  useEffect(() => {
    if (pathname !== "/login" && !isLoading && !user) {
      router.replace("/login");
    }
  }, [pathname, isLoading, user, router]);

  // Senha temporária pendente de troca — bloqueia o app até o usuário definir uma nova
  useEffect(() => {
    if (pathname !== "/change-password" && !isLoading && user?.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [pathname, isLoading, user, router]);

  if (pathname === "/login" || pathname === "/change-password") {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom"></div>
      </div>
    );
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
      <div className={cn("pt-16 lg:pt-0 transition-[margin] duration-300 ease-out", sidebarContentMargin(sidebarCollapsed))}>
        {/* No desktop não há barra superior: tema e notificações ficam no rodapé do menu lateral. */}
        <main className="min-h-screen">
          <div>{children}</div>
        </main>
      </div>
    </div>
  );
}