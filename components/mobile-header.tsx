// components/mobile-header.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
  actionButton?: React.ReactNode;
}

export function MobileHeader({ onMenuClick, actionButton }: MobileHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-primary-custom h-16 flex items-center justify-between px-4">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="bg-secondary-custom rounded-lg w-8 h-8 flex items-center justify-center">
          <span className="text-md font-bold text-white tracking-widest">RS</span>
        </div>
        <span className="text-lg font-bold text-white">Real Sales</span>
      </Link>
      <div className="flex items-center gap-2">
        {actionButton}
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-white hover:bg-white/20 hover:text-white">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </div>
    </header>
  );
}