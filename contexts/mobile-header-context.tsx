"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MobileHeaderContextType {
  setActionButton: (button: ReactNode | null) => void;
  actionButton: ReactNode | null;
}

const MobileHeaderContext = createContext<MobileHeaderContextType | undefined>(undefined);

export function MobileHeaderProvider({ children }: { children: ReactNode }) {
  const [actionButton, setActionButton] = useState<ReactNode | null>(null);

  return (
    <MobileHeaderContext.Provider value={{ actionButton, setActionButton }}>
      {children}
    </MobileHeaderContext.Provider>
  );
}

export function useMobileHeader() {
  const context = useContext(MobileHeaderContext);
  if (!context) {
    throw new Error('useMobileHeader must be used within a MobileHeaderProvider');
  }
  return context;
}