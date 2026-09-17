import { MarketingNavbar } from "@/components/marketing/MarketingNavbar"
import { MarketingFooter } from "@/components/marketing/MarketingFooter"
import { MotionProvider } from "@/components/providers/MotionProvider"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MotionProvider>
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
        <MarketingNavbar />
        <main className="flex-1">
          {children}
        </main>
        <MarketingFooter />
      </div>
    </MotionProvider>
  )
}
