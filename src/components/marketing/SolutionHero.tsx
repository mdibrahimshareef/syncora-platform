import { Button, buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SolutionHeroProps {
  preHeading: string
  heading: string
  subtitle: string
  themeColor?: "blue" | "green" | "purple" | "yellow"
  illustration: ReactNode
}

export function SolutionHero({
  preHeading,
  heading,
  subtitle,
  themeColor = "purple",
  illustration
}: SolutionHeroProps) {
  // Theme color mapping for buttons and accents
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700 text-white",
    green: "bg-emerald-600 hover:bg-emerald-700 text-white",
    purple: "bg-primary hover:bg-primary/90 text-primary-foreground", // SYNCORA primary
    yellow: "bg-amber-500 hover:bg-amber-600 text-white",
  }
  
  const textThemeMap = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    purple: "text-primary",
    yellow: "text-amber-600",
  }

  return (
    <section className="relative overflow-hidden bg-primary/5 pt-8 md:pt-12 lg:pt-16 pb-24 md:pb-32 lg:pb-40 border-b border-border/50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05]" style={{ maskImage: 'linear-gradient(to bottom, transparent, black)' }} />
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2">
        <div className="size-[500px] rounded-full bg-primary/10 blur-[100px] opacity-60 dark:opacity-20 pointer-events-none" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 lg:items-start items-center">
          
          {/* Left Column: Text */}
          <div className="flex flex-col max-w-2xl lg:pr-8 lg:pt-4">
            <div className="mb-6">
              <h2 className={cn("text-xs md:text-sm font-bold tracking-widest uppercase mb-3", textThemeMap[themeColor])}>
                {preHeading}
              </h2>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                {heading}
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mb-8">
              {subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-14 px-8 text-base font-semibold rounded-md shadow-sm border border-transparent", colorMap[themeColor])}>
                GET STARTED
              </Link>
              <Link href="/contact-sales" className={buttonVariants({ variant: "outline", size: "lg", className: "h-14 px-8 text-base font-semibold rounded-md border-border/60 hover:bg-muted" })}>
                TALK TO SALES
              </Link>
            </div>
          </div>
          
          {/* Right Column: Illustration */}
          <div className="relative w-full h-full flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[600px] aspect-[4/3] sm:aspect-video lg:aspect-[4/3]">
              {/* Abstract background container */}
              <div className="absolute inset-0 bg-[#F4EDE4] dark:bg-muted/40 rounded-2xl overflow-hidden" />
              
              {/* Illustration container */}
              <div className="absolute inset-0 flex items-center justify-center">
                {illustration}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Premium curved bottom transition */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20 pointer-events-none transform translate-y-[1px]">
        <svg 
          className="relative block w-full h-[50px] md:h-[80px] lg:h-[120px]" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,0V73.23C125.86,97.77,294.61,114.77,488.5,114.77C720.52,114.77,917.47,95.3,1200,60.53V120H0Z" 
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  )
}
