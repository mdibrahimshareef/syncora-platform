"use client"

import { motion } from "framer-motion"
import { Hexagon, Triangle, Circle, Square, Cloud, Layers } from "lucide-react"

export function SocialProof() {
  const companies = [
    { name: "Acme Corp", icon: Hexagon },
    { name: "Globex", icon: Triangle },
    { name: "Soylent", icon: Circle },
    { name: "Initech", icon: Square },
    { name: "Stark Ind", icon: Cloud },
    { name: "Umbrella", icon: Layers },
  ]

  return (
    <section className="py-12 border-y border-border/50 bg-muted/20 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          
          <div className="md:w-1/3 text-center md:text-left shrink-0">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
              Join 10,000+ teams
            </h3>
            <p className="text-muted-foreground font-medium">
              boosting team productivity by <span className="text-foreground">over 32%</span>
            </p>
          </div>

          <div className="md:w-2/3 w-full overflow-hidden relative">
            {/* Gradient masks for smooth fading on edges */}
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />
            
            <motion.div 
              className="flex items-center gap-8 md:gap-12 w-max"
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            >
              {/* Double the array for seamless infinite looping */}
              {[...companies, ...companies].map((company, idx) => (
                <div key={idx} className="flex items-center gap-2 text-muted-foreground/60 grayscale hover:grayscale-0 hover:text-foreground transition-all duration-300">
                  <company.icon className="size-6" />
                  <span className="font-semibold text-lg tracking-tight">{company.name}</span>
                </div>
              ))}
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
