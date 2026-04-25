"use client";
import { AppLayout } from "@/components/app-layout";
import { MobileHeaderProvider } from "@/contexts/mobile-header-context";
import { Toaster } from "@/components/ui/toaster";
import { PerfMonitor } from "@/components/perf-monitor";
import { PushSubscriber } from "@/components/push-subscriber";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileHeaderProvider>
      <AppLayout>
        {children}
        <Toaster />
        <PerfMonitor />
        <PushSubscriber />
      </AppLayout>
    </MobileHeaderProvider>
  );
}
