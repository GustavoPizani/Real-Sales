// components/navigation.tsx
"use client";

import { AppSidebar } from "./app-sidebar";

interface NavigationProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

/** Menu lateral do CRM. Os itens e o visual ficam em app-sidebar.tsx, junto com os do Marketing. */
export function Navigation(props: NavigationProps) {
  return <AppSidebar system="crm" {...props} />;
}
