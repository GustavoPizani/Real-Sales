// components/navigation.tsx
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Home, Building, Kanban, Settings, LogOut, Users, Shield, CheckSquare, Megaphone, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Role } from '@prisma/client';

const navigationLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Tarefas', href: '/tasks', icon: CheckSquare, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Imóveis', href: '/properties', icon: Building, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
  { name: 'Usuários', href: '/users', icon: Users, roles: ['marketing_adm', 'diretor', 'gerente'] },
  { name: 'Integrações', href: '/integrations', icon: Megaphone, roles: ['marketing_adm'] },
  { name: 'Roleta', href: '/roleta', icon: RotateCcw, roles: ['marketing_adm'] },
  { name: 'Configurações', href: '/settings', icon: Settings, roles: ['marketing_adm', 'diretor', 'gerente', 'corretor'] },
];


export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

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
    <aside 
      className={cn(
        "bg-primary-custom text-white h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="p-4 flex-shrink-0 border-b border-tertiary-custom/50">
        <Link href="/dashboard" className="flex items-center justify-start gap-3">
          <div className="bg-secondary-custom rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
            <span className="text-md font-bold text-white tracking-widest">RS</span>
          </div>
          <div className={cn(
            "flex flex-col transition-opacity duration-200",
            isExpanded ? "opacity-100" : "opacity-0"
          )}>
            <span className="text-lg font-extrabold leading-tight text-white whitespace-nowrap">Real Sales</span>
            <span className="text-xs text-gray-200 font-normal whitespace-nowrap">CRM</span>
          </div>
        </Link>
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
                  className={cn(
                    "flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 group relative",
                    isActive
                      ? "bg-secondary-custom text-primary-custom"
                      : "text-gray-200 hover:bg-tertiary-custom/60 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className={cn(
                      "ml-3 whitespace-nowrap transition-opacity",
                      isExpanded ? "opacity-100" : "opacity-0"
                  )}>
                    {item.name}
                  </span>
                  
                  {!isExpanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-tertiary-custom text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
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
              "ml-3 min-w-0 flex-1 transition-opacity",
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              <p className="text-sm font-semibold truncate whitespace-nowrap">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate whitespace-nowrap">
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
          {isExpanded && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}