// components/navigation.tsx
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Home,
  Building,
  Kanban,
  Settings,
  LogOut,
  CheckSquare,
  X,
  Phone,
  RotateCcw,
  Target,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Role } from '@prisma/client';

type NavItem = { name: string; href: string; icon: React.ElementType; roles: string[] }

const navigationLinks: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente', 'BROKER'] },
  { name: 'Marketing', href: '/marketing', icon: Megaphone, roles: ['ADMIN', 'MARKETING_ADMIN'] },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente', 'BROKER'] },
  { name: 'Roleta e Frequência', href: '/roleta', icon: RotateCcw, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente', 'BROKER'] },
  { name: 'Qualificação', href: '/qualificacao', icon: Target, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente', 'BROKER'] },
  { name: 'Oferta Ativa', href: '/active-offers', icon: Phone, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente', 'BROKER'] },
  { name: 'Tarefas', href: '/tasks', icon: CheckSquare, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente', 'BROKER'] },
  { name: 'Imóveis', href: '/properties', icon: Building, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente', 'BROKER'] },
  { name: 'Configurações', href: '/settings', icon: Settings, roles: ['ADMIN', 'MARKETING_ADMIN', 'diretor', 'gerente'] },
];

interface NavigationProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

export function Navigation({ isMobileOpen, setIsMobileOpen }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);

  const isExpanded = isDesktopExpanded || isMobileOpen;
  const filteredNavigation = navigationLinks.filter((link) => {
    if (user?.isSuperAdmin) return true;
    if (!user?.role || !link.roles) return false;
    return link.roles.includes(user.role);
  });

  const getRoleLabel = (role: Role | string) => {
    const labels: Record<Role | string, string> = {
      [Role.MARKETING_ADMIN]: 'Administrador',
      [Role.BROKER]: 'Corretor',
      'ADMIN': 'Super Admin',
    };
    return labels[role] || role;
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "sidebar-custom text-[var(--text-secondary)] h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          "lg:translate-x-0",
          "overflow-y-auto overflow-x-hidden",
          isDesktopExpanded ? "lg:w-64" : "lg:w-16"
        )}
        onMouseEnter={() => !isMobileOpen && setIsDesktopExpanded(true)}
        onMouseLeave={() => !isMobileOpen && setIsDesktopExpanded(false)}
      >
        <div className="p-4 flex-shrink-0 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center justify-start gap-3">
            <img src="/nordic-logo.svg" alt="Nordic CRM" className="w-8 h-8" />
            <div className={cn(
              "flex flex-col transition-opacity duration-200 whitespace-nowrap",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              <span className="text-lg font-semibold leading-tight text-[var(--text-primary)]">Nordic</span>
              <span className="text-xs text-[var(--text-muted)] font-normal">CRM</span>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden text-[var(--text-secondary)]" onClick={() => setIsMobileOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <nav className="flex-grow px-2 py-4">
          <ul className="space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => isMobileOpen && setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center py-[10px] px-4 text-sm font-medium rounded-md transition-all duration-200 group relative border-l-2",
                      pathname.startsWith(item.href)
                        ? "text-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-glow)]"
                        : "text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className={cn(
                      "ml-3 whitespace-nowrap transition-opacity",
                      isExpanded ? "opacity-100" : "opacity-0"
                    )}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-[var(--border-subtle)] flex-shrink-0">
          <div className="flex items-center min-w-0 mb-3">
              <div className="w-10 h-10 bg-[var(--accent-glow)] rounded-full flex items-center justify-center flex-shrink-0 border border-[var(--border-accent)]">
                <span className="text-md font-medium text-[var(--accent-primary)]">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={cn(
                "ml-3 min-w-0 flex-1 transition-opacity whitespace-nowrap",
                isExpanded ? "opacity-100" : "opacity-0"
              )}>
                <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{user?.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {getRoleLabel(user?.role || '')}
                </p>
              </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className={cn(
              "w-full text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors duration-200",
              isExpanded ? "justify-start" : "justify-center"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={cn(
              "ml-3",
              !isExpanded && "hidden"
            )}>Sair</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
