"use client";

import { useAuth } from '@/contexts/auth-context';
import { Navigation } from '@/components/navigation';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Páginas que não devem mostrar o sidebar
  const publicPages = ['/login', '/'];
  const isPublicPage = publicPages.includes(pathname);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se for página pública ou usuário não logado, não mostrar sidebar
  if (isPublicPage || !user) {
    return <>{children}</>;
  }

  // Páginas autenticadas com sidebar
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1 ml-16 overflow-auto">
        {children}
      </main>
    </div>
  );
}
