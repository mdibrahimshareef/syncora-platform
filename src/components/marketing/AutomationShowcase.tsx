"use client"

import { useRef } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { CheckCircle2, ArrowRight, Zap, Bell, CheckSquare, GitMerge } from "lucide-react"

// ─── Flowing data pulse along an SVG path ─────────────────────────────────────
// Renders a glowing dot that travels from one node to another.
function DataPulse({
  d,
  color,
  delay,
  duration = 1.8,
}: {
  d: string
  color: string
  delay: number
  duration?: number
}) {
  return (
    <>
      {/* Static dashed track */}
      <path d={d} fill="transparent" strokeWidth="1.5" stroke="currentColor"
        className="text-border/60" strokeDasharray="5 5" />

      {/* Animated solid line drawing in */}
      <motion.path
        d={d} fill="transparent" strokeWidth="2" stroke={color}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: duration * 0.8, delay, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Glowing dot travelling along the path */}
      <motion.circle
        r="5" fill={color}
        filter={`drop-shadow(0 0 6px ${color})`}
        initial={{ offsetDistance: "0%", opacity: 0 }}
        animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
        transition={{ duration, delay: delay + 0.3, ease: "easeInOut" }}
        style={{
          offsetPath: `path("${d}")`,
        } as React.CSSProperties}
      />
    </>
  )
}

// ─── Automation card ───────────────────────────────────────────────────────────
function AutoCard({
  delay,
  className,
  accentColor,
  accentBg,
  icon: Icon,
  title,
  children,
  glow = false,
}: {
  delay: number
  className: string
  accentColor: string
  accentBg: string
  icon: typeof CheckSquare
  title: string
  children: React.ReactNode
  glow?: boolean
}) {
  const isInView = useInView(useRef(null), { once: true })

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`absolute bg-background border border-border shadow-lg rounded-xl p-4 z-10 ${className}`}
      style={{
        boxShadow: glow
          ? `0 0 0 1px ${accentColor}30, 0 8px 32px -8px ${accentColor}40, 0 2px 8px rgba(0,0,0,0.08)`
          : undefined,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60"
        style={{ background: accentColor }}
      />

      <div className="flex items-center gap-3 mb-2 mt-1">
        <div
          className="size-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: accentBg }}
        >
          <Icon className="size-4" style={{ color: accentColor }} />
        </div>
        <div className="text-sm font-semibold leading-tight">{title}</div>
      </div>
      {children}
    </motion.div>
  )
}

// ─── Checklist item with staggered reveal ──────────────────────────────────────
function CheckItem({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.li
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18, delay: delay + 0.1 }}
      >
        <CheckCircle2 className="size-5 text-primary mt-0.5 shrink-0" />
      </motion.div>
      <span className="text-foreground leading-snug">{text}</span>
    </motion.li>
  )
}

// ─── Animated status badge that cycles ────────────────────────────────────────
function StatusCycle() {
  return (
    <div className="bg-muted rounded border border-border px-3 py-1.5 text-xs flex justify-between items-center gap-2">
      <motion.span
        key="a"
        animate={{ opacity: [1, 1, 0, 0, 1] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.35, 0.45, 0.55, 0.65] }}
        className="text-orange-500 font-medium"
      >
        In Progress
      </motion.span>
      <ArrowRight className="size-3 text-muted-foreground shrink-0" />
      <motion.span
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.55, 0.9, 1] }}
        className="text-green-500 font-medium"
      >
        Done ✓
      </motion.span>
    </div>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────────
export function AutomationShowcase() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" })
  const prefersReduced = useReducedMotion()

  const PATHS = {
    left:   "M 250,120 C 250,180 120,180 120,220",
    right:  "M 250,120 C 250,180 380,180 380,220",
    botL:   "M 120,320 C 120,380 250,380 250,420",
    botR:   "M 380,320 C 380,380 250,380 250,420",
  }

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="py-28 bg-muted/30 overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: copy ──────────────────────────────────────────── */}
          <div>
            {/* Label pill */}
            <motion.div
              className="inline-flex items-center rounded-full border border-yellow-500/20
                         bg-yellow-500/10 px-3 py-1 text-sm font-medium
                         text-yellow-600 dark:text-yellow-400 mb-6"
              initial={{ opacity: 0, y: -12 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                animate={isInView ? { rotate: [0, 12, -8, 0] } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mr-2 inline-block"
              >
                <Zap className="size-4" />
              </motion.span>
              Automations
            </motion.div>

            {/* Headline — word by word */}
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight">
              {["Let", "repetitive", "work", "move", "itself."].map((word, i) => (
                <motion.span
                  key={i}
                  className="inline-block mr-[0.3em]"
                  initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
                  animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                  transition={{ duration: 0.55, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                </motion.span>
              ))}
            </h2>

            <motion.p
              className="text-lg text-muted-foreground mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Set up rules to automatically assign tasks, update statuses, and notify
              team members. Focus on the work that matters, not the busywork.
            </motion.p>

            <ul className="space-y-4 mb-8">
              {[
                { text: "Auto-assign tasks based on project phase",       delay: 0.75 },
                { text: "Send notifications when priorities change",       delay: 0.90 },
                { text: "Move tasks to 'Done' when subtasks are complete", delay: 1.05 },
              ].map(({ text, delay }) => (
                isInView && <CheckItem key={text} text={text} delay={delay} />
              ))}
            </ul>

            {/* Subtle "rule count" badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                         bg-primary/8 border border-primary/20 text-sm font-medium text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.45, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <GitMerge className="size-4" />
              Build unlimited automation rules
            </motion.div>
          </div>

          {/* ── Right: diagram ──────────────────────────────────────── */}
          <div className="relative h-[380px] sm:h-[450px] md:h-[600px] w-full max-w-lg mx-auto mt-12 lg:mt-0 flex justify-center">
            <div className="relative w-[500px] h-[600px] origin-top scale-[0.65] sm:scale-75 md:scale-100">

              {/* Glow behind the diagram */}
              {!prefersReduced && (
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                             size-[340px] rounded-full bg-primary/10 blur-[60px] pointer-events-none"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* SVG connection paths */}
              <svg
                className="absolute inset-0 h-full w-full pointer-events-none"
                viewBox="0 0 500 600"
                preserveAspectRatio="xMidYMid meet"
                style={{ zIndex: 0 }}
              >
                {isInView && !prefersReduced && (
                  <>
                    <DataPulse d={PATHS.left}  color="#6366f1" delay={1.0} />
                    <DataPulse d={PATHS.right} color="#3b82f6" delay={1.3} />
                    <DataPulse d={PATHS.botL}  color="#6366f1" delay={3.0} />
                    <DataPulse d={PATHS.botR}  color="#a855f7" delay={3.3} />

                    {/* Repeat pulses for looping feel */}
                    <DataPulse d={PATHS.left}  color="#6366f1" delay={5.5} duration={1.6} />
                    <DataPulse d={PATHS.right} color="#3b82f6" delay={5.8} duration={1.6} />
                    <DataPulse d={PATHS.botL}  color="#6366f1" delay={7.2} duration={1.6} />
                    <DataPulse d={PATHS.botR}  color="#a855f7" delay={7.5} duration={1.6} />
                  </>
                )}

                {/* Static tracks always visible */}
                {(!isInView || prefersReduced) && (
                  <>
                    <path d={PATHS.left}  fill="transparent" strokeWidth="1.5" stroke="currentColor" className="text-border/60" strokeDasharray="5 5" />
                    <path d={PATHS.right} fill="transparent" strokeWidth="1.5" stroke="currentColor" className="text-border/60" strokeDasharray="5 5" />
                    <path d={PATHS.botL}  fill="transparent" strokeWidth="1.5" stroke="currentColor" className="text-border/60" strokeDasharray="5 5" />
                    <path d={PATHS.botR}  fill="transparent" strokeWidth="1.5" stroke="currentColor" className="text-border/60" strokeDasharray="5 5" />
                  </>
                )}
              </svg>

              {/* Trigger block — top centre */}
              {isInView && (
                <AutoCard
                  delay={0.2}
                  className="top-[40px] left-1/2 -translate-x-1/2 w-[240px]"
                  accentColor="#6366f1"
                  accentBg="rgba(99,102,241,0.12)"
                  icon={CheckSquare}
                  title="When status changes"
                  glow
                >
                  <StatusCycle />
                </AutoCard>
              )}

              {/* Action 1 — left */}
              {isInView && (
                <AutoCard
                  delay={1.6}
                  className="top-[220px] left-0 w-[220px]"
                  accentColor="#eab308"
                  accentBg="rgba(234,179,8,0.12)"
                  icon={Bell}
                  title="Send Slack Message"
                >
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border/50 leading-relaxed">
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: 3 }}
                    >
                      "Marketing Report completed! 🎉"
                    </motion.span>
                  </div>
                </AutoCard>
              )}

              {/* Action 2 — right */}
              {isInView && (
                <AutoCard
                  delay={1.9}
                  className="top-[220px] right-0 w-[220px]"
                  accentColor="#a855f7"
                  accentBg="rgba(168,85,247,0.12)"
                  icon={CheckCircle2}
                  title="Update Parent Task"
                >
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border/50">
                    Mark milestone as{" "}
                    <motion.span
                      className="text-purple-500 font-bold"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 3.5 }}
                    >
                      100%
                    </motion.span>
                  </div>
                </AutoCard>
              )}

              {/* Final action — bottom centre */}
              {isInView && (
                <AutoCard
                  delay={3.5}
                  className="top-[420px] left-1/2 -translate-x-1/2 w-[240px]"
                  accentColor="#22c55e"
                  accentBg="rgba(34,197,94,0.12)"
                  icon={CheckCircle2}
                  title="Move to List"
                  glow
                >
                  <div className="bg-muted rounded border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                    <motion.span
                      className="size-2 rounded-full bg-green-500 shrink-0"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 4 }}
                    />
                    Review &amp; Sign-off
                  </div>
                </AutoCard>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
