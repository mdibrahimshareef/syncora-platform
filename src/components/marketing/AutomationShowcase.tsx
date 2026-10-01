"use client"

import { useRef } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { CheckCircle2, ArrowRight, Zap, Bell, CheckSquare, GitMerge } from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Single shared ease curve (Apple / Linear style)
const EASE = [0.16, 1, 0.3, 1] as const

// ─── Flowing data pulse along an SVG path ────────────────────────────────────
// Dot loops infinitely after trigger so the diagram feels continuously alive.
function DataPulse({
  d,
  color,
  delay,
  duration = 1.8,
  triggered,
}: {
  d: string
  color: string
  delay: number
  duration?: number
  triggered: boolean
}) {
  const loopDelay = delay + duration + 1.2 // gap before next loop
  return (
    <>
      {/* Static dashed track */}
      <path
        d={d} fill="transparent" strokeWidth="1.5"
        stroke="currentColor" className="text-border/40"
        strokeDasharray="6 5"
      />

      {/* Solid line that draws in once, stays */}
      <motion.path
        d={d} fill="transparent" strokeWidth="1.5" stroke={color}
        style={{ opacity: 0.35 }}
        initial={{ pathLength: 0 }}
        animate={triggered ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: duration * 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Large glowing leading dot — loops */}
      <motion.circle
        r="4.5" fill={color}
        style={{
          filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}80)`,
          offsetPath: `path("${d}")`,
        } as React.CSSProperties}
        initial={{ offsetDistance: "0%", opacity: 0 }}
        animate={
          triggered
            ? { offsetDistance: ["0%", "100%"], opacity: [0, 1, 1, 0] }
            : { offsetDistance: "0%", opacity: 0 }
        }
        transition={{
          duration,
          delay: delay + 0.2,
          ease: [0.4, 0, 0.6, 1],
          repeat: Infinity,
          repeatDelay: 2.5,
          times: [0, 0.15, 0.85, 1],
        }}
      />

      {/* Smaller trailing dot — staggered 0.25s behind */}
      <motion.circle
        r="2.5" fill={color}
        style={{
          filter: `drop-shadow(0 0 4px ${color})`,
          offsetPath: `path("${d}")`,
          opacity: 0.6,
        } as React.CSSProperties}
        initial={{ offsetDistance: "0%", opacity: 0 }}
        animate={
          triggered
            ? { offsetDistance: ["0%", "100%"], opacity: [0, 0.7, 0.7, 0] }
            : { offsetDistance: "0%", opacity: 0 }
        }
        transition={{
          duration,
          delay: delay + 0.45,
          ease: [0.4, 0, 0.6, 1],
          repeat: Infinity,
          repeatDelay: 2.5,
          times: [0, 0.15, 0.85, 1],
        }}
      />
    </>
  )
}

// ─── Automation card ──────────────────────────────────────────────────────────
function AutoCard({
  triggered,
  delay,
  className,
  accentColor,
  accentBg,
  icon: Icon,
  title,
  children,
  glow = false,
}: {
  triggered: boolean
  delay: number
  className: string
  accentColor: string
  accentBg: string
  icon: typeof CheckSquare
  title: string
  children: React.ReactNode
  glow?: boolean
}) {
  const baseShadow = glow
    ? `0 0 0 1px ${accentColor}20, 0 4px 20px -4px ${accentColor}25, 0 1px 4px rgba(0,0,0,0.05)`
    : `0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)`
  const hoverShadow = `0 0 0 1.5px ${accentColor}45, 0 12px 40px -6px ${accentColor}35, 0 4px 16px rgba(0,0,0,0.1)`

  return (
    <motion.div
      className={`absolute bg-background border border-border/60 rounded-xl p-4 z-10 overflow-hidden cursor-default ${className}`}
      style={{ boxShadow: baseShadow }}
      initial={{ opacity: 0, y: 22, scale: 0.93 }}
      animate={triggered ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 22, scale: 0.93 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      whileHover={{
        y: -6,
        scale: 1.03,
        boxShadow: hoverShadow,
        borderColor: `${accentColor}60`,
      }}
      // spring physics on hover so it doesn't snap
      // @ts-ignore — transition inside whileHover is valid framer-motion API
      whileHover_transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      {/* Top accent gradient bar — brightens on hover */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        initial={{ opacity: 0.5 }}
        whileHover={{ opacity: 1, scaleX: 1.05 }}
        transition={{ duration: 0.2 }}
      />

      {/* Subtle inner glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accentColor}10, transparent 65%)` }}
      />

      <div className="relative flex items-center gap-3 mb-2.5 mt-1">
        {/* Icon container — pulses subtly, scales on card hover */}
        <motion.div
          className="size-8 rounded-full flex items-center justify-center shrink-0 relative"
          style={{ background: accentBg }}
          animate={triggered ? { boxShadow: [`0 0 0 0px ${accentColor}30`, `0 0 0 4px ${accentColor}10`, `0 0 0 0px ${accentColor}30`] } : {}}
          transition={{ duration: 3, repeat: Infinity, delay: delay + 1.5, ease: "easeInOut" }}
          whileHover={{ scale: 1.15 }}
        >
          <Icon className="size-4" style={{ color: accentColor }} />
        </motion.div>
        <span className="text-sm font-semibold leading-tight">{title}</span>
      </div>
      <div className="relative">{children}</div>
    </motion.div>
  )
}

// ─── Cycling status badge with progress bar ───────────────────────────────────
function StatusCycle({ triggered }: { triggered: boolean }) {
  const CYCLE = 4.5 // seconds per full cycle
  return (
    <div className="space-y-2">
      <div className="bg-muted rounded-lg border border-border/60 px-3 py-2 text-xs flex justify-between items-center gap-2">
        {/* "In Progress" fades out at mid-cycle */}
        <motion.span
          className="font-medium text-orange-500"
          animate={triggered ? { opacity: [1, 1, 0, 0, 1] } : { opacity: 1 }}
          transition={{ duration: CYCLE, repeat: Infinity, times: [0, 0.35, 0.5, 0.6, 0.75] }}
        >
          In Progress
        </motion.span>
        <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
        {/* "Done ✓" fades in at mid-cycle */}
        <motion.span
          className="font-medium text-green-500"
          animate={triggered ? { opacity: [0, 0, 1, 1, 0] } : { opacity: 0 }}
          transition={{ duration: CYCLE, repeat: Infinity, times: [0, 0.5, 0.65, 0.88, 1] }}
        >
          Done ✓
        </motion.span>
      </div>

      {/* Progress bar sweeps left → right on each cycle */}
      <div className="h-[3px] w-full rounded-full bg-border/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, #f97316, #22c55e)` }}
          animate={triggered ? { x: ["-101%", "0%", "101%"] } : { x: "-101%" }}
          transition={{ duration: CYCLE, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
        />
      </div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────
export function AutomationShowcase() {
  const sectionRef = useRef<HTMLElement>(null)

  // `amount: 0.35` = fires only when 35% of the section is in view.
  // This ensures the user has genuinely reached the section before anything plays.
  const isInView = useInView(sectionRef, { once: true, amount: 0.35 })

  const prefersReduced = useReducedMotion()
  const triggered = isInView && !prefersReduced

  const PATHS = {
    left:  "M 250,120 C 250,180 120,180 120,220",
    right: "M 250,120 C 250,180 380,180 380,220",
    botL:  "M 120,320 C 120,380 250,380 250,420",
    botR:  "M 380,320 C 380,380 250,380 250,420",
  }

  // Delays are relative to the trigger firing:
  // Left col: 0 → ~1.2s
  // Right col diagram: starts at 0.4s (cards & paths staggered from there)
  const textDelays = {
    pill:      0,
    word:      (i: number) => 0.15 + i * 0.12,   // 120ms stagger (was 70ms)
    body:      0.90,                               // pushed back from 0.55
    check1:    1.10,                               // pushed back from 0.70
    check2:    1.30,                               // pushed back from 0.85
    check3:    1.50,                               // pushed back from 1.00
    badge:     1.70,                               // pushed back from 1.15
  }

  const diagramDelays = {
    trigger:   0.4,
    pathLeft:  0.9,
    pathRight: 1.1,
    card1:     1.4,
    card2:     1.65,
    pathBotL:  2.8,
    pathBotR:  3.0,
    final:     3.3,
  }

  const headline = ["Let", "repetitive", "work", "move", "itself."]

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-28 bg-muted/30 overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── LEFT: text ───────────────────────────────────────────────── */}
          <div>
            {/* Label pill */}
            <motion.div
              className="inline-flex items-center rounded-full border border-yellow-500/20
                         bg-yellow-500/10 px-3 py-1 text-sm font-medium
                         text-yellow-600 dark:text-yellow-400 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.45, delay: textDelays.pill, ease: EASE }}
            >
              <motion.span
                className="mr-2 inline-block"
                animate={triggered ? { rotate: [0, 14, -8, 0] } : {}}
                transition={{ duration: 0.55, delay: 0.45 }}
              >
                <Zap className="size-4" />
              </motion.span>
              Automations
            </motion.div>

            {/* Headline — one word at a time */}
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight">
              {headline.map((word, i) => (
                <motion.span
                  key={i}
                  className="inline-block mr-[0.3em]"
                  initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
                  animate={
                    isInView
                      ? { opacity: 1, y: 0, filter: "blur(0px)" }
                      : { opacity: 0, y: 28, filter: "blur(4px)" }
                  }
                  transition={{ duration: 0.65, delay: textDelays.word(i), ease: EASE }}
                >
                  {word}
                </motion.span>
              ))}
            </h2>

            {/* Body text */}
            <motion.p
              className="text-lg text-muted-foreground mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.5, delay: textDelays.body, ease: EASE }}
            >
              Set up rules to automatically assign tasks, update statuses, and notify
              team members. Focus on the work that matters, not the busywork.
            </motion.p>

            {/* Checklist */}
            <ul className="space-y-4 mb-8">
              {[
                { text: "Auto-assign tasks based on project phase",        delay: textDelays.check1 },
                { text: "Send notifications when priorities change",        delay: textDelays.check2 },
                { text: "Move tasks to 'Done' when subtasks are complete",  delay: textDelays.check3 },
              ].map(({ text, delay }) => (
                <motion.li
                  key={text}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -14 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
                  transition={{ duration: 0.45, delay, ease: EASE }}
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18, delay: delay + 0.1 }}
                  >
                    <CheckCircle2 className="size-5 text-primary mt-0.5 shrink-0" />
                  </motion.div>
                  <span className="text-foreground leading-snug">{text}</span>
                </motion.li>
              ))}
            </ul>

            {/* Footer badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                         bg-primary/8 border border-primary/20 text-sm font-medium text-primary"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.4, delay: textDelays.badge, ease: EASE }}
            >
              <GitMerge className="size-4" />
              Build unlimited automation rules
            </motion.div>
          </div>

          {/* ── RIGHT: diagram ───────────────────────────────────────────── */}
          <div className="relative h-[380px] sm:h-[450px] md:h-[600px] w-full max-w-lg mx-auto mt-12 lg:mt-0 flex justify-center">
            <div className="relative w-[500px] h-[600px] origin-top scale-[0.65] sm:scale-75 md:scale-100">

              {/* Ambient glow orb */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                           size-[320px] rounded-full bg-primary/10 blur-[70px] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={triggered ? { opacity: 1, scale: [1, 1.12, 1] } : { opacity: 0 }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: diagramDelays.trigger }}
              />

              {/* SVG paths */}
              <svg
                className="absolute inset-0 h-full w-full pointer-events-none"
                viewBox="0 0 500 600"
                preserveAspectRatio="xMidYMid meet"
                style={{ zIndex: 0 }}
              >
                <DataPulse d={PATHS.left}  color="#6366f1" delay={diagramDelays.pathLeft}  triggered={triggered} />
                <DataPulse d={PATHS.right} color="#3b82f6" delay={diagramDelays.pathRight} triggered={triggered} />
                <DataPulse d={PATHS.botL}  color="#6366f1" delay={diagramDelays.pathBotL}  triggered={triggered} />
                <DataPulse d={PATHS.botR}  color="#a855f7" delay={diagramDelays.pathBotR}  triggered={triggered} />

                {/* Junction nodes — pulsing rings at path fork/merge points */}
                {([
                  { cx: 250, cy: 120, color: "#6366f1", delay: diagramDelays.pathLeft },       // trigger bottom
                  { cx: 120, cy: 320, color: "#eab308", delay: diagramDelays.card1 + 0.3 },    // action 1 bottom
                  { cx: 380, cy: 320, color: "#a855f7", delay: diagramDelays.card2 + 0.3 },    // action 2 bottom
                  { cx: 250, cy: 420, color: "#22c55e", delay: diagramDelays.final - 0.2 },    // final top
                ] as const).map(({ cx, cy, color, delay }) => (
                  <g key={`${cx}-${cy}`}>
                    {/* Solid inner dot */}
                    <motion.circle
                      cx={cx} cy={cy} r="4" fill={color}
                      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={triggered ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                      transition={{ duration: 0.35, delay, ease: EASE }}
                    />
                    {/* Expanding ring */}
                    <motion.circle
                      cx={cx} cy={cy} r="4" fill="none"
                      stroke={color} strokeWidth="1.5"
                      initial={{ scale: 1, opacity: 0 }}
                      animate={triggered ? { scale: [1, 2.5], opacity: [0.8, 0] } : { opacity: 0 }}
                      transition={{
                        duration: 1.6,
                        delay: delay + 0.3,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: "easeOut",
                      }}
                    />
                  </g>
                ))}
              </svg>

              {/* Trigger card — top centre */}
              <AutoCard
                triggered={triggered}
                delay={diagramDelays.trigger}
                className="top-[40px] left-1/2 -translate-x-1/2 w-[240px]"
                accentColor="#6366f1"
                accentBg="rgba(99,102,241,0.1)"
                icon={CheckSquare}
                title="When status changes"
                glow
              >
                <StatusCycle triggered={triggered} />
              </AutoCard>

              {/* Action 1 — left */}
              <AutoCard
                triggered={triggered}
                delay={diagramDelays.card1}
                className="top-[220px] left-0 w-[220px]"
                accentColor="#eab308"
                accentBg="rgba(234,179,8,0.1)"
                icon={Bell}
                title="Send Slack Message"
              >
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border/50 leading-relaxed">
                  <motion.span
                    animate={triggered ? { opacity: [1, 0.55, 1] } : {}}
                    transition={{ duration: 2.8, repeat: Infinity, delay: 3.5 }}
                  >
                    "Marketing Report completed! 🎉"
                  </motion.span>
                </div>
              </AutoCard>

              {/* Action 2 — right */}
              <AutoCard
                triggered={triggered}
                delay={diagramDelays.card2}
                className="top-[220px] right-0 w-[220px]"
                accentColor="#a855f7"
                accentBg="rgba(168,85,247,0.1)"
                icon={CheckCircle2}
                title="Update Parent Task"
              >
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border/50">
                  Mark milestone as{" "}
                  <motion.span
                    className="text-purple-500 font-bold"
                    animate={triggered ? { opacity: [0.5, 1, 0.5] } : {}}
                    transition={{ duration: 2, repeat: Infinity, delay: 4 }}
                  >
                    100%
                  </motion.span>
                </div>
              </AutoCard>

              {/* Final action — bottom centre */}
              <AutoCard
                triggered={triggered}
                delay={diagramDelays.final}
                className="top-[420px] left-1/2 -translate-x-1/2 w-[240px]"
                accentColor="#22c55e"
                accentBg="rgba(34,197,94,0.1)"
                icon={CheckCircle2}
                title="Move to List"
                glow
              >
                <div className="bg-muted rounded-lg border border-border/60 px-3 py-2 text-xs flex items-center gap-2">
                  <motion.span
                    className="size-2 rounded-full bg-green-500 shrink-0"
                    animate={triggered ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] } : {}}
                    transition={{ duration: 1.4, repeat: Infinity, delay: 4.5 }}
                  />
                  Review &amp; Sign-off
                </div>
              </AutoCard>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
