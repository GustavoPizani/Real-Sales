import { AppLayout } from "@/components/app-layout";
import { Toaster } from "@/components/ui/toaster";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      {children}
      <Toaster />
    </AppLayout>
  );
} 
