import { Metadata } from "next"
import dynamic from "next/dynamic"
import { HeroSection } from "@/components/marketing/HeroSection"
import { AISection } from "@/components/marketing/AISection"
import { SocialProof } from "@/components/marketing/SocialProof"
import { ValueProposition } from "@/components/marketing/ValueProposition"

// Lazy load below-the-fold heavy interactive components
const ViewsShowcase = dynamic(() => import("@/components/marketing/ViewsShowcase").then(mod => mod.ViewsShowcase))
const AutomationShowcase = dynamic(() => import("@/components/marketing/AutomationShowcase").then(mod => mod.AutomationShowcase))
const IntegrationsShowcase = dynamic(() => import("@/components/marketing/IntegrationsShowcase").then(mod => mod.IntegrationsShowcase))
const FinalCTA = dynamic(() => import("@/components/marketing/FinalCTA").then(mod => mod.FinalCTA))

export const metadata: Metadata = {
  title: "SYNCORA — Your team's work, in sync.",
  description: "Plan projects, collaborate in real time, and keep every piece of work connected — all in one workspace.",
}

export default function MarketingPage() {
  return (
    <div>
      <HeroSection />
      <AISection />
      <SocialProof />
      <ValueProposition />
      <ViewsShowcase />
      <AutomationShowcase />
      <IntegrationsShowcase />
      <FinalCTA />
    </div>
  )
}
