"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Home, Building, Kanban, Settings, LogOut, Bell, Users, Shield, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Tarefas', href: '/tasks', icon: CheckSquare },
  { name: 'Imóveis', href: '/properties', icon: Building },
  { name: 'Usuários', href: '/users', icon: Users, roles: ['admin', 'diretor', 'gerente'] },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true;
    if (user?.role === 'admin') return true;
    return item.roles.includes(user?.role || 'corretor');
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'diretor':
        return <div className="h-3 w-3 bg-purple-500 rounded-full" />;
      case 'gerente':
        return <div className="h-3 w-3 bg-blue-500 rounded-full" />;
      case 'corretor':
        return <div className="h-3 w-3 bg-green-500 rounded-full" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'diretor':
        return 'Diretor';
      case 'gerente':
        return 'Gerente';
      case 'corretor':
        return 'Corretor';
      default:
        return role;
    }
  };

  return (
    <div 
      className={cn(
        "bg-primary-custom text-white h-screen flex flex-col transition-all duration-300 ease-in-out fixed left-0 top-0 z-50",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-center">
          <Logo 
            size="sm" 
            showText={isExpanded} 
            className="text-white transition-all duration-300" 
          />
        </div>
      </div>
      
      <nav className="flex-1 px-2 overflow-hidden">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    "hover:bg-secondary-custom hover:text-white group relative",
                    isActive
                      ? "bg-secondary-custom text-white shadow-lg"
                      : "text-gray-300"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span 
                    className={cn(
                      "ml-3 transition-all duration-300 whitespace-nowrap",
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                    )}
                  >
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

      <div className="p-3 border-t border-tertiary-custom flex-shrink-0">
        <div className={cn(
          "flex items-center mb-3 transition-all duration-300",
          isExpanded ? "justify-between" : "justify-center"
        )}>
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 bg-secondary-custom rounded-full flex items-center justify-center flex-shrink-0 relative">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -bottom-1 -right-1">
                {getRoleIcon(user?.role || 'corretor')}
              </div>
            </div>
            {isExpanded && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {getRoleLabel(user?.role || 'corretor')}
                </p>
              </div>
            )}
          </div>
          
          {isExpanded && (
            <Button variant="ghost" size="sm" className="flex-shrink-0 text-white hover:bg-secondary-custom">
              <Bell className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button
          onClick={logout}
          variant="ghost"
          className={cn(
            "w-full text-gray-300 hover:bg-secondary-custom hover:text-white transition-all duration-200",
            isExpanded ? "justify-start" : "justify-center px-3"
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {isExpanded && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </div>
  );
}
