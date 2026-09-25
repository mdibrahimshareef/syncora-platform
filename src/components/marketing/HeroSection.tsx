"use client"

import { MouseEvent as ReactMouseEvent } from "react"
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, CheckCircle2, PlayCircle, ShieldCheck } from "lucide-react"

export function HeroSection() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // 3D Tilt state for dashboard
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const springConfig = { damping: 20, stiffness: 150, mass: 0.5 }
  const springRotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [10, -10]), springConfig)
  const springRotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-10, 10]), springConfig)

  // Subtle parallax for the background grid
  const gridX = useSpring(useTransform(mouseX, [0, 2000], [-40, 40]), { stiffness: 40, damping: 20 })
  const gridY = useSpring(useTransform(mouseY, [0, 1000], [-40, 40]), { stiffness: 40, damping: 20 })

  function handleMouseMove({ currentTarget, clientX, clientY }: ReactMouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect()
    // Map mouse position to roughly [0, 2000] and [0, 1000] ranges for consistent transform scaling
    const normalizedX = ((clientX - left) / width) * 2000
    const normalizedY = ((clientY - top) / height) * 1000
    
    mouseX.set(normalizedX)
    mouseY.set(normalizedY)
  }

  function handleDashboardMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    tiltX.set(x)
    tiltY.set(y)
  }

  function handleDashboardMouseLeave() {
    tiltX.set(0)
    tiltY.set(0)
  }

  return (
    <section 
      className="relative pt-24 pb-32 lg:pt-36 lg:pb-40 overflow-hidden group bg-background"
      onMouseMove={handleMouseMove}
    >
      {/* Interactive Hexagonal Data-Flow Grid Spotlight */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          maskImage: useMotionTemplate`radial-gradient(800px circle at ${mouseX}px ${mouseY}px, black, transparent 80%)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(800px circle at ${mouseX}px ${mouseY}px, black, transparent 80%)`
        }}
      >
        <motion.div
          className="absolute inset-0 text-primary dark:text-white opacity-50"
          style={{ x: gridX, y: gridY }}
        >
          <svg className="absolute inset-0 h-[120%] w-[120%] -left-[10%] -top-[10%]" xmlns="http://www.w3.org/2000/svg">
            <style>
              {`
                @keyframes dash-crawl {
                  to {
                    stroke-dashoffset: -200;
                  }
                }
                .animate-dash-crawl {
                  stroke-dasharray: 20 20;
                  animation: dash-crawl 5s linear infinite;
                }
              `}
            </style>
            <defs>
              <pattern id="hero-hex-grid" width="50" height="86.6" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <path 
                  className="animate-dash-crawl" 
                  d="M25 0L50 14.4V43.3L25 57.7L0 43.3V14.4L25 0ZM25 86.6L50 72.2V43.3M0 72.2L25 86.6V57.7" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.5" 
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-hex-grid)" />
          </svg>
        </motion.div>
      </motion.div>
      
      {/* Grid Fade Mask */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-background/50 via-transparent to-background" />

      {/* Ambient Glows */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 z-0 pointer-events-none">
        <div className="size-[500px] rounded-full bg-primary/20 blur-[120px] opacity-40 dark:opacity-20" />
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 z-0 pointer-events-none">
        <div className="size-[400px] rounded-full bg-blue-500/20 blur-[120px] opacity-40 dark:opacity-20" />
      </div>

      <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight relative inline-block"
          >
            Your team's work, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">in perfect sync.</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Plan projects, collaborate in real time, and keep every piece of work connected. One workspace for your entire team to achieve more together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className={buttonVariants({ size: "lg", className: "h-12 px-8 rounded-full text-base font-semibold w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" })}>
              Get Started for Free
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link href="#product" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-8 rounded-full text-base font-semibold w-full sm:w-auto bg-background/50 backdrop-blur-sm border-border/50 hover:bg-accent/50 transition-all" })}>
              <PlayCircle className="mr-2 size-5 text-muted-foreground" />
              Watch Demo
            </Link>
          </div>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <span className="size-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <span className="size-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" />
              <span>SOC2 Certified</span>
            </div>
          </div>
        </motion.div>

        {/* 3D Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 mx-auto max-w-5xl relative perspective-1000"
          style={{ perspective: "1200px" }}
          onMouseMove={handleDashboardMouseMove}
          onMouseLeave={handleDashboardMouseLeave}
        >
          <motion.div 
            className="relative rounded-xl md:rounded-2xl border border-border/50 bg-background shadow-2xl shadow-black/20 dark:shadow-[0_20px_80px_-10px_rgba(255,255,255,0.4)] dark:border-white/20 dark:border-b-white/60 overflow-hidden transform-gpu" 
            style={{ 
              transformStyle: "preserve-3d", 
              rotateX: springRotateX, 
              rotateY: springRotateY,
              y: -10 
            }}
          >
            {/* Mock Header */}
            <div className="h-12 border-b border-border/50 bg-muted/30 flex items-center px-4 justify-between">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-muted rounded-md" />
                <div className="h-6 w-8 bg-primary/20 rounded-md" />
              </div>
            </div>
            {/* Mock Content */}
            <div className="h-[400px] md:h-[600px] p-6 flex gap-6 bg-gradient-to-b from-background to-muted/10">
              {/* Sidebar */}
              <div className="w-48 hidden md:flex flex-col gap-6 border-r border-border/50 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-6 bg-primary rounded-md" />
                  <div className="h-4 w-20 bg-foreground/80 rounded" />
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</div>
                  <div className="flex items-center gap-2 text-sm text-foreground/80 bg-muted/50 p-2 rounded-md"><div className="size-4 bg-blue-500/50 rounded-sm" /> Board</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2"><div className="size-4 bg-green-500/50 rounded-sm" /> List</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2"><div className="size-4 bg-purple-500/50 rounded-sm" /> Calendar</div>
                </div>
              </div>
              {/* Main Area (Kanban Board) */}
              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Q3 Marketing Launch</h2>
                  <div className="flex -space-x-2">
                    <div className="size-8 rounded-full border-2 border-background bg-blue-500" />
                    <div className="size-8 rounded-full border-2 border-background bg-green-500" />
                    <div className="size-8 rounded-full border-2 border-background bg-yellow-500" />
                  </div>
                </div>
                <div className="flex gap-4 h-full">
                  {/* Column 1 */}
                  <div className="flex-1 rounded-xl bg-muted/30 border border-border/50 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold flex items-center gap-2"><div className="size-2 rounded-full bg-slate-500" /> To Do</div>
                      <span className="text-xs text-muted-foreground">3</span>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card p-3 rounded-lg border border-border/50 dark:border-white/10 shadow-sm flex flex-col gap-3">
                      <div className="flex gap-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-medium tracking-wide">DESIGN</span></div>
                      <div className="text-sm font-medium">Create social assets</div>
                      <div className="flex justify-between items-center"><div className="size-5 rounded-full bg-blue-500/50" /><span className="text-xs text-muted-foreground">Oct 12</span></div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-card p-3 rounded-lg border border-border/50 dark:border-white/10 shadow-sm flex flex-col gap-3">
                      <div className="flex gap-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-medium tracking-wide">COPY</span></div>
                      <div className="text-sm font-medium">Draft press release</div>
                      <div className="flex justify-between items-center"><div className="size-5 rounded-full bg-green-500/50" /><span className="text-xs text-muted-foreground">Oct 14</span></div>
                    </motion.div>
                  </div>

                  {/* Column 2 */}
                  <div className="flex-1 rounded-xl bg-muted/30 border border-border/50 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold flex items-center gap-2"><div className="size-2 rounded-full bg-blue-500" /> In Progress</div>
                      <span className="text-xs text-muted-foreground">2</span>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-card p-3 rounded-lg border border-border/50 dark:border-white/10 shadow-sm flex flex-col gap-3">
                      <div className="flex gap-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-medium tracking-wide">VIDEO</span></div>
                      <div className="text-sm font-medium">Edit promo video</div>
                      <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-primary w-2/3 h-full rounded-full" /></div>
                      <div className="flex justify-between items-center"><div className="size-5 rounded-full bg-yellow-500/50" /><span className="text-xs text-muted-foreground">Oct 10</span></div>
                    </motion.div>
                  </div>

                  {/* Column 3 */}
                  <div className="flex-1 rounded-xl bg-muted/30 border border-border/50 p-4 flex flex-col gap-3 opacity-80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold flex items-center gap-2"><div className="size-2 rounded-full bg-green-500" /> Done</div>
                      <span className="text-xs text-muted-foreground">5</span>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-card p-3 rounded-lg border border-border/50 dark:border-white/10 shadow-sm flex flex-col gap-3 opacity-60">
                      <div className="flex gap-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 font-medium tracking-wide">PLANNING</span></div>
                      <div className="text-sm font-medium line-through">Finalize budget</div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
