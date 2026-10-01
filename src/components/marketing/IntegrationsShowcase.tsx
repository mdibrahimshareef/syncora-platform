"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { useTheme } from "next-themes"
import {
  SiGithub, SiFigma, SiJira, SiGoogle, SiNotion,
  SiDropbox, SiZoom, SiCalendly, SiSnowflake, SiAtlassian,
  SiHubspot, SiLinear, SiAsana, SiTrello, SiStripe,
  SiIntercom, SiAirtable, SiMiro, SiPostman, SiConfluence,
  SiGitlab, SiVercel,
} from "react-icons/si"
import { IconType } from "react-icons"

interface Integration {
  name: string
  Icon: IconType
  /** Brand colour shown in light mode (and on hover at full saturation) */
  color: string
  /**
   * Override colour for dark-mode idle state.
   * Required for near-black logos (GitHub, Notion, Vercel) that would be
   * invisible against the dark `oklch(0.13)` background.
   */
  darkColor?: string
  /** Tinted background shown on hover */
  bg: string
}

// 10 logos per row
const row1: Integration[] = [
  { name: "GitHub",  Icon: SiGithub,  color: "#24292F", darkColor: "#E6EDF3", bg: "rgba(36,41,47,0.08)"   },
  { name: "Figma",   Icon: SiFigma,   color: "#F24E1E",                        bg: "rgba(242,78,30,0.08)"  },
  { name: "Jira",    Icon: SiJira,    color: "#0052CC",                        bg: "rgba(0,82,204,0.08)"   },
  { name: "Google",  Icon: SiGoogle,  color: "#4285F4",                        bg: "rgba(66,133,244,0.08)" },
  { name: "Notion",  Icon: SiNotion,  color: "#191919", darkColor: "#F0F0F0", bg: "rgba(120,120,120,0.08)" },
  { name: "Dropbox", Icon: SiDropbox, color: "#0061FF",                        bg: "rgba(0,97,255,0.08)"   },
  { name: "Stripe",  Icon: SiStripe,  color: "#635BFF",                        bg: "rgba(99,91,255,0.08)"  },
  { name: "Postman", Icon: SiPostman, color: "#FF6C37",                        bg: "rgba(255,108,55,0.08)" },
  { name: "GitLab",  Icon: SiGitlab,  color: "#FC6D26",                        bg: "rgba(252,109,38,0.08)" },
  { name: "Vercel",  Icon: SiVercel,  color: "#000000", darkColor: "#F5F5F5", bg: "rgba(120,120,120,0.08)" },
]

const row2: Integration[] = [
  { name: "Zoom",       Icon: SiZoom,      color: "#2D8CFF",                        bg: "rgba(45,140,255,0.08)"  },
  { name: "Calendly",   Icon: SiCalendly,  color: "#006BFF",                        bg: "rgba(0,107,255,0.08)"   },
  { name: "Snowflake",  Icon: SiSnowflake, color: "#29B5E8",                        bg: "rgba(41,181,232,0.08)"  },
  { name: "Atlassian",  Icon: SiAtlassian, color: "#0052CC",                        bg: "rgba(0,82,204,0.08)"    },
  { name: "HubSpot",    Icon: SiHubspot,   color: "#FF7A59",                        bg: "rgba(255,122,89,0.08)"  },
  { name: "Linear",     Icon: SiLinear,    color: "#5E6AD2",                        bg: "rgba(94,106,210,0.08)"  },
  { name: "Asana",      Icon: SiAsana,     color: "#F06A6A",                        bg: "rgba(240,106,106,0.08)" },
  { name: "Trello",     Icon: SiTrello,    color: "#0052CC",                        bg: "rgba(0,82,204,0.08)"    },
  { name: "Intercom",   Icon: SiIntercom,  color: "#1F8DED",                        bg: "rgba(31,141,237,0.08)"  },
  { name: "Confluence", Icon: SiConfluence,color: "#0052CC",                        bg: "rgba(0,82,204,0.08)"    },
]

// ─── Logo card ────────────────────────────────────────────────────────────────
function LogoCard({
  integration,
  isDark,
}: {
  integration: Integration
  isDark: boolean
}) {
  // Resolved idle colour: use darkColor override when in dark mode
  const idleColor =
    isDark && integration.darkColor ? integration.darkColor : integration.color

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.06 }}
      transition={{ type: "spring", stiffness: 340, damping: 22, mass: 0.6 }}
      className="group relative flex flex-col items-center gap-3 px-5 py-4 rounded-2xl
                 bg-background/60 border border-border/50 backdrop-blur-sm
                 cursor-pointer shrink-0 w-28 select-none"
      style={{ willChange: "transform" }}
    >
      {/* Ambient brand glow — only visible on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
                   transition-opacity duration-300 pointer-events-none"
        style={{
          background: integration.bg,
          boxShadow: `0 8px 32px -4px ${integration.color}40`,
        }}
      />

      {/* Icon container — soft brand-tinted bg at rest, vivid on hover */}
      <div
        className="relative z-10 p-3 rounded-xl transition-all duration-300
                   group-hover:shadow-lg group-hover:border-transparent"
        style={{
          backgroundColor: `${idleColor}18`,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: `${idleColor}35`,
        }}
      >
        {/* Idle icon at partial opacity — colour is visible, not garish */}
        <integration.Icon
          className="size-8 transition-all duration-300 group-hover:opacity-0"
          style={{ color: idleColor, opacity: 0.72 }}
          aria-hidden="true"
        />

        {/* Hover icon — full brand colour, fades in */}
        <integration.Icon
          className="size-8 absolute inset-3 transition-all duration-300
                     opacity-0 group-hover:opacity-100"
          style={{ color: integration.color }}
          aria-hidden="true"
        />
      </div>

      {/* Label */}
      <span className="relative z-10 text-xs font-semibold text-muted-foreground
                       group-hover:text-foreground transition-colors duration-300
                       text-center leading-tight">
        {integration.name}
      </span>
    </motion.div>
  )
}

// ─── Marquee row ──────────────────────────────────────────────────────────────
function MarqueeRow({
  items,
  direction,
  isDark,
}: {
  items: Integration[]
  direction: "left" | "right"
  isDark: boolean
}) {
  const doubled = [...items, ...items]

  return (
    <div className="marquee-row w-full overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div
        className={
          direction === "left"
            ? "animate-marquee-left flex gap-4 w-max py-2"
            : "animate-marquee-right flex gap-4 w-max py-2"
        }
      >
        {doubled.map((item, idx) => (
          <LogoCard key={`${item.name}-${idx}`} integration={item} isDark={isDark} />
        ))}
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
export function IntegrationsShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const { resolvedTheme } = useTheme()

  // next-themes: resolvedTheme is undefined on the server and during the first
  // client render. We must match the server output (isDark=false) on that first
  // paint, then update after mount — otherwise React throws a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <section ref={ref} className="py-28 relative overflow-hidden bg-background">

      {/* Subtle radial glow behind the whole section */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, hsl(var(--primary)/0.07) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Integrations
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            Integrates with your entire stack
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            SYNCORA connects seamlessly with 100+ tools you already use — keeping
            your workflows automated and data perfectly synced.
          </p>
        </motion.div>
      </div>

      {/* Marquee rows */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-4"
      >
        <MarqueeRow items={row1} direction="left"  isDark={isDark} />
        <MarqueeRow items={row2} direction="right" isDark={isDark} />
      </motion.div>
    </section>
  )
}
