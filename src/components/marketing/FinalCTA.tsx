import { Button, buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ShieldCheck, Lock } from "lucide-react"

export function FinalCTA() {
  return (
    <section className="pt-32 pb-24 relative overflow-hidden bg-primary text-primary-foreground">
      {/* Top curved transition to close the theme out */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-20 pointer-events-none transform -translate-y-[1px]">
        <svg 
          className="relative block w-full h-[50px] md:h-[80px] lg:h-[120px]" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,120V46.77C125.86,22.23,294.61,5.23,488.5,5.23C720.52,5.23,917.47,24.7,1200,59.47V0H0Z" 
            className="fill-background"
          />
        </svg>
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-[bottom_1px_center]" style={{ maskImage: 'linear-gradient(to bottom, transparent, black)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="size-[600px] rounded-full bg-white/10 blur-[100px] opacity-30 pointer-events-none" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center mt-12">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-white">
          Ready to sync your team?
        </h2>
        <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
          Join thousands of teams who have already transformed the way they work. Free forever for small teams.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className={buttonVariants({ variant: "secondary", size: "lg", className: "h-14 px-10 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transition-all w-full sm:w-auto" })}>
            Get Started for Free
          </Link>
          <p className="text-sm text-primary-foreground/70 sm:hidden mt-2">
            No credit card required.
          </p>
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm font-medium text-primary-foreground/70">
          <div className="flex items-center gap-2">
            <Lock className="size-4" />
            <span>Enterprise-grade security</span>
          </div>
          <div className="hidden sm:block size-1 rounded-full bg-primary-foreground/20" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span>SOC2 Type II Certified</span>
          </div>
          <div className="hidden sm:block size-1 rounded-full bg-primary-foreground/20" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-blue-300" />
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </section>
  )
}
