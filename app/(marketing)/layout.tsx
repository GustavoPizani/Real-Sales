import { MarketingLayout } from "@/components/marketing-layout"
import { Toaster } from "@/components/ui/toaster"

export default function MarketingRouteGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MarketingLayout>
      {children}
      <Toaster />
    </MarketingLayout>
  )
}
