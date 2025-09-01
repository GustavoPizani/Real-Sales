"use client";
import { AppLayout } from "@/components/app-layout";
import { MobileHeaderProvider } from "@/contexts/mobile-header-context";
import { Toaster } from "@/components/ui/toaster";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileHeaderProvider>
      <AppLayout>
        {children}
        <Toaster />
      </AppLayout>
    </MobileHeaderProvider>
  );
} 
