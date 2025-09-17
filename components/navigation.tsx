// components/navigation.tsx
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Home, Building, Kanban, Settings, LogOut, CheckSquare, X, Phone, RotateCcw, Target, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Role } from '@prisma/client';

const navigationLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Roleta e Frequência', href: '/roleta', icon: RotateCcw, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Qualificação', href: '/qualificacao', icon: Target, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Oferta Ativa', href: '/active-offers', icon: Phone, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Tarefas', href: '/tasks', icon: CheckSquare, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Imóveis', href: '/properties', icon: Building, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  //{ name: "Integrações", href: "/integrations", icon: Megaphone, roles: ['marketing_adm'] },
  { name: 'Configurações', href: '/settings', icon: Settings, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
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

  const filteredNavigation = navigationLinks.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const getRoleLabel = (role: Role | string) => {
    const labels: Record<Role | string, string> = {
      [Role.marketing_adm]: 'Administrador',
      [Role.diretor]: 'Diretor',
      [Role.gerente]: 'Gerente',
      [Role.corretor]: 'Corretor',
    };
    return labels[role] || role;
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Overlay para fechar o menu no mobile */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "bg-primary-custom text-white h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
          // Lógica para Mobile: controlado por isMobileOpen
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          // Lógica para Desktop: sobrepõe a lógica mobile
          "lg:translate-x-0",
          isDesktopExpanded ? "lg:w-64" : "lg:w-16"
        )}
        onMouseEnter={() => !isMobileOpen && setIsDesktopExpanded(true)}
        onMouseLeave={() => !isMobileOpen && setIsDesktopExpanded(false)}
      >
        {/* Logo */}
        <div className="p-4 flex-shrink-0 border-b border-tertiary-custom/50 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center justify-start gap-3">
            <div className="bg-secondary-custom rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
              <span className="text-md font-bold text-white tracking-widest">RS</span>
            </div>
            <div className={cn(
              "flex flex-col transition-opacity duration-200 whitespace-nowrap",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              <span className="text-lg font-extrabold leading-tight text-white">Real Sales</span>
              <span className="text-xs text-gray-200 font-normal">CRM</span>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => isMobileOpen && setIsMobileOpen(false)} // Fecha o menu ao clicar num link no mobile
                    className={cn(
                      "flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 group relative border-l-4",
                      isActive
                        ? "bg-secondary-custom text-primary-custom border-secondary-custom"
                        : "text-gray-200 border-transparent hover:bg-tertiary-custom/60 hover:text-white"
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

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-tertiary-custom/50 flex-shrink-0">
          <div className="flex items-center min-w-0 mb-3">
              <div className="w-10 h-10 bg-tertiary-custom rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-md font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={cn(
                "ml-3 min-w-0 flex-1 transition-opacity whitespace-nowrap",
                isExpanded ? "opacity-100" : "opacity-0"
              )}>
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {getRoleLabel(user?.role || '')}
                </p>
              </div>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="ghost"
            className={cn(
              "w-full text-gray-300 hover:bg-tertiary-custom/60 hover:text-white transition-colors duration-200",
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