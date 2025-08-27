// components/app-layout.tsx
"use client";

import type React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "./navigation";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom"></div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Conteúdo Principal com margem ajustada para a sidebar RECOLHIDA */}
      <div className="lg:ml-16 transition-all duration-300">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}