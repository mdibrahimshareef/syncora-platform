"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useReducedMotion, AnimatePresence, type TargetAndTransition } from "framer-motion"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ShieldCheck, Lock, ArrowRight, Sparkles } from "lucide-react"

// ─── Word-by-word headline reveal ─────────────────────────────────────────────
function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(" ")
  return (
    <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-white leading-tight">
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 40, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.65,
            delay: 0.1 + i * 0.07,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </h2>
  )
}

// ─── Floating particle ─────────────────────────────────────────────────────────
function Particle({ x, y, size, delay, duration }: {
  x: number; y: number; size: number; delay: number; duration: number
}) {
  return (
    <motion.div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{
        y: [0, -80, 0],
        opacity: [0, 0.6, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

// ─── Animated gradient orb ─────────────────────────────────────────────────────
function GradientOrb({ className, animate: anim }: {
  className: string
  animate: TargetAndTransition
}) {
  return (
    <motion.div
      className={`absolute rounded-full blur-[80px] opacity-20 pointer-events-none ${className}`}
      animate={anim}
      transition={{ duration: 12, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    />
  )
}

// ─── Shimmer CTA button ────────────────────────────────────────────────────────
function ShimmerButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative group/btn inline-flex">
      <motion.span
        className="relative z-10 inline-flex items-center gap-2 h-14 px-10 rounded-full
                   bg-white text-primary text-lg font-bold shadow-xl
                   group-hover/btn:shadow-white/30 group-hover/btn:shadow-2xl
                   transition-shadow duration-300 overflow-hidden select-none"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
      >
        {/* Shimmer sweep */}
        <motion.span
          className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent
                     via-white/50 to-transparent pointer-events-none"
          initial={{ x: "-120%" }}
          animate={{ x: "220%" }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
        />
        <Sparkles className="size-5 shrink-0" />
        <span className="relative z-10">{children}</span>
        <motion.span
          className="relative z-10"
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight className="size-5 shrink-0" />
        </motion.span>
      </motion.span>
    </Link>
  )
}

// ─── Staggered trust badge ─────────────────────────────────────────────────────
function TrustBadge({
  icon: Icon,
  label,
  iconClass,
  delay,
}: {
  icon: typeof Lock
  label: string
  iconClass: string
  delay: number
}) {
  return (
    <motion.div
      className="flex items-center gap-2 text-sm font-medium text-white/60"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ color: "rgba(255,255,255,0.95)", scale: 1.03 }}
    >
      <Icon className={`size-4 shrink-0 ${iconClass}`} />
      <span>{label}</span>
    </motion.div>
  )
}

// ─── Live team count with count-up ────────────────────────────────────────────
function LiveCounter({ target = 10000 }: { target?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const duration = 1800
    const step = 16
    const increment = target / (duration / step)

    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, step)
    return () => clearInterval(timer)
  }, [isInView, target])

  return (
    <span ref={ref} className="font-bold text-white tabular-nums">
      {count.toLocaleString()}+
    </span>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: 20 + Math.random() * 70,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 5,
  duration: 5 + Math.random() * 7,
}))

export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" })
  const prefersReduced = useReducedMotion()

  return (
    <section
      ref={sectionRef}
      className="pt-32 pb-24 relative overflow-hidden bg-primary text-primary-foreground"
    >
      {/* ── Top curved transition ──────────────────────────────────────── */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-20 pointer-events-none -translate-y-px">
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

      {/* ── Animated gradient orbs ─────────────────────────────────────── */}
      {!prefersReduced && (
        <>
          <GradientOrb
            className="size-[700px] bg-violet-400 -top-32 -left-48"
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          />
          <GradientOrb
            className="size-[500px] bg-indigo-300 bottom-0 right-0"
            animate={{ x: [0, -50, 0], y: [0, -60, 0] }}
          />
          <GradientOrb
            className="size-[300px] bg-fuchsia-300 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] }}
          />
        </>
      )}

      {/* ── Floating particles ─────────────────────────────────────────── */}
      {!prefersReduced &&
        PARTICLES.map((p) => (
          <Particle key={p.id} x={p.x} y={p.y} size={p.size} delay={p.delay} duration={p.duration} />
        ))}

      {/* ── Mesh grid overlay ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
        }}
      />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center mt-12">

        {/* Pill label */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                     border border-white/20 bg-white/10 backdrop-blur-sm
                     text-sm font-medium text-white/80 mb-8"
        >
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <LiveCounter target={10000} /> teams already onboard
        </motion.div>

        {/* Headline — word by word */}
        {isInView && (
          <AnimatedHeadline text="Let repetitive work move itself." />
        )}

        {/* Subtext */}
        <motion.p
          className="text-xl text-white/70 max-w-xl mx-auto mb-12 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          Start with a generous free tier — no credit card, no lock-in. Just your
          team, moving faster.
        </motion.p>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center"
        >
          <ShimmerButton href="/signup">Get Started for Free</ShimmerButton>
        </motion.div>

        {/* Separator */}
        <motion.div
          className="mt-16 mb-8 flex items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-white/20" />
          <span className="text-xs text-white/30 font-medium tracking-widest uppercase">Trusted & secure</span>
          <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-white/20" />
        </motion.div>

        {/* Trust badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          <TrustBadge icon={Lock}        label="Enterprise-grade security" iconClass="text-white/50" delay={1.0} />
          <div className="hidden sm:block size-1 rounded-full bg-white/15" />
          <TrustBadge icon={ShieldCheck} label="AES-256 Encryption"        iconClass="text-emerald-400"  delay={1.1} />
          <div className="hidden sm:block size-1 rounded-full bg-white/15" />
          <TrustBadge icon={ShieldCheck} label="GDPR Compliant"            iconClass="text-blue-300"     delay={1.2} />
        </div>
      </div>
    </section>
  )
}
