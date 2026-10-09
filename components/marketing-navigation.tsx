"use client"

import { AppSidebar } from "./app-sidebar"

interface MarketingNavigationProps {
  isMobileOpen: boolean
  setIsMobileOpen: (v: boolean) => void
}

/** Menu lateral do Marketing. Os itens e o visual ficam em app-sidebar.tsx, junto com os do CRM. */
export function MarketingNavigation(props: MarketingNavigationProps) {
  return <AppSidebar system="marketing" {...props} />
}
