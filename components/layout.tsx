import React from 'react';
import Script from 'next/script';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { MobileHeaderProvider } from '@/contexts/mobile-header-context';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Carrega a API principal do Google Maps primeiro */}
        <Script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,marker`} strategy="beforeInteractive" />
        {/* Carrega a biblioteca de componentes estendidos depois */}
        <Script src="https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js" type="module" strategy="beforeInteractive" />
      </head>
      <body>
        <AuthProvider><MobileHeaderProvider>{children}</MobileHeaderProvider></AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
