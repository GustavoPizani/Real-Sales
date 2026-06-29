"use client";
import { useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { MobileHeaderProvider } from "@/contexts/mobile-header-context";
import { PerfMonitor } from "@/components/perf-monitor";
import { warmUpDb } from "@/lib/api-cache";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    warmUpDb();
  }, []);

  return (
    <MobileHeaderProvider>
      <AppLayout>
        {children}
        <PerfMonitor />
      </AppLayout>
    </MobileHeaderProvider>
  );
}
