// app/imovel/layout.tsx
import type React from "react";
import { Toaster } from "@/components/ui/toaster";

// Layout simples para as páginas públicas de imóveis.
export default function ImovelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}