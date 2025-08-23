// app/(app)/layout.tsx - VERSÃO CORRIGIDA

import { AppLayout } from "@/components/app-layout" // Importe o AppLayout aqui

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}