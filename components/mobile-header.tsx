// components/mobile-header.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { ThemeToggleIcon } from './theme-toggle-icon';

interface MobileHeaderProps {
  onMenuClick: () => void;
  actionButton?: React.ReactNode;
}

export function MobileHeader({ onMenuClick, actionButton }: MobileHeaderProps) {
  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 border-b border-[var(--sidebar-nav-border)]"
      style={{ background: 'var(--sidebar-nav-bg)' }}
    >
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="bg-[var(--accent-glow)] rounded-lg w-8 h-8 flex items-center justify-center border border-[var(--border-accent)]">
          <span className="text-md font-bold text-[var(--accent-primary)] tracking-widest">N</span>
        </div>
        <span className="text-lg font-semibold text-[var(--sidebar-nav-text-strong)]">Nordic</span>
      </Link>
      <div className="flex items-center gap-1">
        {actionButton}
        <ThemeToggleIcon variant="header" />
        <NotificationBell variant="header" />
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-[var(--sidebar-nav-text)] hover:text-[var(--accent-primary)] hover:bg-transparent">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </div>
    </header>
  );
}
