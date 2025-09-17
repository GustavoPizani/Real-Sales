"use client"; // ✅ ESSENCIAL: Garante que os componentes customizados sejam reconhecidos.

import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmpx-api-loader': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        key: string;
      };
      'gmp-map': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        center: string;
        zoom: string;
        'map-id'?: string;
      };
      'gmpx-place-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        value?: any;
      };
      'gmp-advanced-marker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        position?: string | null;
        title?: string;
      };
    }
  }
}

// Este componente agora serve apenas para declarar os tipos globais para o TypeScript.
// O carregamento real dos scripts foi movido para o `app-layout.tsx` para maior robustez.
const GoogleMapsLoader = () => null;

export default GoogleMapsLoader;
