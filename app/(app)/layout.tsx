"use client";
import { AppLayout } from "@/components/app-layout";
import { MobileHeaderProvider } from "@/contexts/mobile-header-context";
import { PerfMonitor } from "@/components/perf-monitor";
import { PushSubscriber } from "@/components/push-subscriber";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileHeaderProvider>
      <AppLayout>
        {children}
        <PerfMonitor />
        <PushSubscriber />
      </AppLayout>
    </MobileHeaderProvider>
  );
}
