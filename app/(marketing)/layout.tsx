import { MarketingLayout } from "@/components/marketing-layout"

export default function MarketingRouteGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MarketingLayout>
      {children}
    </MarketingLayout>
  )
}
