// components/app-sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ArrowRight, Bot, Building, CheckSquare, Home, Kanban, LayoutDashboard, LogOut, Megaphone, MessageCircle,
  Moon, PanelLeftClose, PanelLeftOpen, Phone, RotateCcw, Settings, SlidersHorizontal, Slack, Sun, Target, X, Zap,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "./notification-bell";

export type SidebarSystem = "crm" | "marketing";

/**
 * Margem do conteúdo no desktop, igual à largura do menu (4.75rem recolhido,
 * 16rem aberto): o menu empurra a página em vez de ficar por cima dela.
 */
export const sidebarContentMargin = (collapsed: boolean) => (collapsed ? "lg:ml-[4.75rem]" : "lg:ml-64");

type CounterKey = "overdueTasks";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Só o administrador vê. */
  adminOnly?: boolean;
  /** Ativo só na rota exata (para a raiz de um sistema). */
  exact?: boolean;
  counter?: CounterKey;
}

// Um menu por sistema. O CRM e o Marketing são quase produtos separados: cada
// um mostra só os próprios itens e o seletor no topo troca de um para o outro.
const SYSTEMS: Record<SidebarSystem, { label: string; home: string; icon: LucideIcon; items: NavItem[] }> = {
  crm: {
    label: "CRM",
    home: "/dashboard",
    icon: Home,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Pipeline", href: "/pipeline", icon: Kanban },
      { name: "Tarefas", href: "/tasks", icon: CheckSquare, counter: "overdueTasks" },
      { name: "Imóveis", href: "/properties", icon: Building },
      { name: "Roleta", href: "/roleta", icon: RotateCcw },
      { name: "Qualificação", href: "/qualificacao", icon: Target, adminOnly: true },
      { name: "Oferta Ativa", href: "/active-offers", icon: Phone },
    ],
  },
  marketing: {
    label: "Marketing",
    home: "/marketing",
    icon: Megaphone,
    items: [
      { name: "Dashboard", href: "/marketing", icon: LayoutDashboard, exact: true },
      { name: "Config. do dashboard", href: "/marketing/settings", icon: SlidersHorizontal },
      { name: "Integrações", href: "/marketing/integrations", icon: Zap },
      { name: "WhatsApp", href: "/marketing/whatsapp", icon: MessageCircle },
      { name: "Agentes SDR", href: "/marketing/agents", icon: Bot },
      { name: "Slack", href: "/marketing/slack", icon: Slack },
    ],
  },
};

// Texto do menu sobre o navy fixo do painel (6,5:1). O token antigo, #70778C, dava 4:1.
const INK = "text-[#9AA1B5]";
const INK_STRONG = "text-[var(--sidebar-nav-text-strong)]";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]";

// Os textos ficam sempre montados e só aparecem/somem por opacidade: ao abrir o
// menu nada muda de lugar (os ícones têm posição fixa), só a largura cresce.
const labelCls = (collapsed: boolean) =>
  cn("truncate transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100 delay-75");

const isItemActive = (item: NavItem, pathname: string) =>
  item.exact ? pathname === item.href : pathname.startsWith(item.href);

const initialsOf = (name?: string | null) =>
  (name ?? "").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";

/** Nome do item ao lado do ícone quando o menu está recolhido. */
function RailTip({ label, show, children }: { label: string; show: boolean; children: React.ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className="z-[60] rounded-full border border-border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

interface AppSidebarProps {
  system: SidebarSystem;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

/**
 * Menu lateral único do sistema, usado pelo CRM e pelo Marketing.
 * No desktop fica colado à esquerda, na altura inteira da tela, recolhe por
 * botão (não por mouse), empurra o conteúdo e permite navegar recolhido.
 * No celular é uma gaveta.
 */
export function AppSidebar({ system, isMobileOpen, setIsMobileOpen }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsedPref, setCollapsed] = useSidebarCollapsed();
  const [counters, setCounters] = useState<Partial<Record<CounterKey, number>>>({});

  // Na gaveta do celular o menu está sempre aberto.
  const collapsed = collapsedPref && !isMobileOpen;
  const isAdmin = !!user?.isSuperAdmin;
  const current = SYSTEMS[system];
  const other = SYSTEMS[system === "crm" ? "marketing" : "crm"];
  const isDark = theme === "dark";

  // Contadores do menu: ao trocar de página e a cada 2 minutos.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () =>
      dashboardFetch("/api/nav/counters")
        .then(res => (res.ok ? res.json() : null))
        .then(data => { if (data && !cancelled) setCounters(data); })
        .catch(() => null);
    load();
    const timer = window.setInterval(load, 120_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [user, pathname]);

  const items = current.items.filter(item => isAdmin || !item.adminOnly);

  const closeMobile = () => { if (isMobileOpen) setIsMobileOpen(false); };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Tooltip.Provider delayDuration={150}>
      {isMobileOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setIsMobileOpen(false)} />}

      <aside
        aria-label={`Menu ${current.label}`}
        className={cn(
          "sidebar-custom fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col overflow-hidden transition-[width,transform] duration-200 ease-out motion-reduce:transition-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          collapsed ? "lg:w-[4.75rem]" : "lg:w-64",
        )}
      >
        {/* Marca */}
        <div className="flex h-14 flex-shrink-0 items-center gap-3 pl-5 pr-3">
          <Link href={current.home} onClick={closeMobile} aria-label={`Nordic ${current.label}`} className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-lg", FOCUS)}>
            <img src="/nordic-logo.svg" alt="" className="h-9 w-9 flex-shrink-0" />
            <span className={cn("flex min-w-0 flex-col whitespace-nowrap", labelCls(collapsed))}>
              <span className={cn("text-base font-semibold leading-tight", INK_STRONG)}>Nordic</span>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-primary)]">{current.label}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Fechar menu"
            className={cn("grid h-10 w-10 flex-shrink-0 place-items-center rounded-full lg:hidden", INK, FOCUS)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Seletor de sistema: só o administrador tem os dois. */}
        {isAdmin && (
          <div className="flex h-12 flex-shrink-0 items-center px-3">
            {collapsed ? (
              <RailTip label={`Ir para ${other.label}`} show>
                <Link
                  href={other.home}
                  aria-label={`Ir para ${other.label}`}
                  className={cn("flex h-9 w-full items-center rounded-lg border border-[var(--sidebar-nav-border)] pl-[16px] transition-colors hover:bg-white/[0.06] hover:text-white", INK, FOCUS)}
                >
                  <other.icon className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
                </Link>
              </RailTip>
            ) : (
              <div className="grid w-full grid-cols-2 gap-1 rounded-full bg-black/25 p-1" role="group" aria-label="Sistema">
                {(["crm", "marketing"] as const).map(key => {
                  const active = key === system;
                  return (
                    <Link
                      key={key}
                      href={SYSTEMS[key].home}
                      onClick={closeMobile}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                        active ? "bg-[var(--accent-primary)] text-[#07090D]" : cn(INK, "hover:text-white"),
                        FOCUS,
                      )}
                    >
                      {SYSTEMS[key].label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Itens */}
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="space-y-1">
            {items.map(item => {
              const active = isItemActive(item, pathname);
              const count = item.counter ? counters[item.counter] ?? 0 : 0;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <RailTip label={count > 0 ? `${item.name} (${count} atrasadas)` : item.name} show={collapsed}>
                    <Link
                      href={item.href}
                      onClick={closeMobile}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.name : undefined}
                      className={cn(
                        "group relative flex h-10 items-center gap-3 rounded-lg pl-[17px] pr-3 text-sm transition-colors duration-150",
                        active
                          ? cn("bg-white/[0.08] font-semibold", INK_STRONG)
                          : cn(INK, "hover:bg-white/[0.06] hover:text-white"),
                        FOCUS,
                      )}
                    >
                      {/* Item ativo: fundo sutil, barra dourada à esquerda e ícone dourado. */}
                      {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent-primary)]" aria-hidden="true" />}
                      <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", active && "text-[var(--accent-primary)]")} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                      <span className={cn("min-w-0 flex-1", labelCls(collapsed))}>{item.name}</span>
                      {count > 0 && (
                        collapsed ? (
                          <span className="absolute right-2.5 top-1.5 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
                        ) : (
                          <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive-foreground">
                            {count > 99 ? "99+" : count}
                            <span className="sr-only"> atrasadas</span>
                          </span>
                        )
                      )}
                    </Link>
                  </RailTip>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé: cartão do usuário (configurações, tema e sair), sino e recolher. */}
        <div className="flex-shrink-0 px-3 pb-3 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${user?.name ?? "Usuário"}: configurações e conta`}
                className={cn(
                  "group relative flex h-[4.25rem] w-full items-center gap-3 overflow-hidden rounded-2xl border pl-[3px] pr-3 text-left transition-colors duration-150",
                  collapsed ? "border-transparent bg-transparent" : "border-white/10 bg-white/[0.05] hover:border-[var(--accent-primary)]/50",
                  FOCUS,
                )}
              >
                {/* Faixa diagonal dourada atrás da foto. Recolhido, sobra só a foto, na mesma posição. */}
                <span
                  aria-hidden="true"
                  className={cn("absolute -bottom-4 -left-6 -top-4 w-[4.6rem] -skew-x-12 bg-gradient-to-b from-[#E6CB98] to-[#B8935A] transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-90")}
                />
                <span className={cn("relative flex-shrink-0 rounded-full p-[2px]", collapsed ? "bg-gradient-to-br from-[#E6CB98] to-[#B8935A]" : "bg-white/90")}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#171C26] text-sm font-semibold text-[var(--accent-primary)]">
                    {initialsOf(user?.name)}
                  </span>
                </span>
                <span className={cn("relative min-w-0 flex-1", labelCls(collapsed))}>
                  <span className={cn("block truncate text-sm font-semibold leading-tight", INK_STRONG)}>{user?.name}</span>
                  <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/75">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
                    <span className="truncate">{isAdmin ? "Administrador" : "Corretor"}</span>
                  </span>
                </span>
                <ArrowRight className={cn("relative h-4 w-4 flex-shrink-0 text-[var(--accent-primary)] transition-transform group-hover:translate-x-0.5", collapsed && "opacity-0")} aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} sideOffset={12} className="w-56">
              <DropdownMenuLabel className="truncate">{user?.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={closeMobile}>
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
                {isDark ? <Sun className="mr-2 h-4 w-4" aria-hidden="true" /> : <Moon className="mr-2 h-4 w-4" aria-hidden="true" />}
                {isDark ? "Tema claro" : "Tema escuro"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* No celular o sino fica no cabeçalho; aqui só no desktop. */}
          <div className={cn("mt-1 hidden items-center lg:flex", collapsed ? "flex-col gap-1" : "justify-between pl-1.5")}>
            <NotificationBell variant="header" placement="right" />
            <RailTip label="Abrir menu" show={collapsed}>
              <button
                type="button"
                onClick={() => setCollapsed(!collapsedPref)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Abrir menu" : "Recolher menu"}
                className={cn("flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors hover:bg-white/[0.06] hover:text-white", INK, FOCUS)}
              >
                {collapsed
                  ? <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
                  : <><PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />Recolher</>}
              </button>
            </RailTip>
          </div>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
