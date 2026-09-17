"use client"

import { motion } from "framer-motion"
import { CheckCircle2, ArrowRight, Zap, Bell, CheckSquare } from "lucide-react"

export function AutomationShowcase() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <div className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-6">
              <Zap className="mr-2 size-4" />
              Automations
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Let repetitive work <br/> move itself.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Set up rules to automatically assign tasks, update statuses, and notify team members. Focus on the work that matters, not the busywork.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                "Auto-assign tasks based on project phase",
                "Send notifications when priorities change",
                "Move tasks to 'Done' when subtasks are complete"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-primary" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative h-[380px] sm:h-[450px] md:h-[600px] w-full max-w-lg mx-auto mt-12 lg:mt-0 flex justify-center">
            <div className="relative w-[500px] h-[600px] origin-top scale-[0.65] sm:scale-75 md:scale-100">
              {/* The Automation Path Lines */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 500 600" preserveAspectRatio="xMidYMid meet" style={{ zIndex: 0 }}>
                {/* Path 1: Trigger -> Action 1 (Left) */}
                <motion.path
                  d="M 250,120 C 250,180 120,180 120,220"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-border" strokeDasharray="5 5"
                />
                <motion.path
                  d="M 250,120 C 250,180 120,180 120,220"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-primary"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
                />

                {/* Path 2: Trigger -> Action 2 (Right) */}
                <motion.path
                  d="M 250,120 C 250,180 380,180 380,220"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-border" strokeDasharray="5 5"
                />
                <motion.path
                  d="M 250,120 C 250,180 380,180 380,220"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-blue-500"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.2, ease: "easeInOut", delay: 0.4 }}
                />

                {/* Path 3: Action 1 & 2 -> Final Action (Center) */}
                <motion.path
                  d="M 120,320 C 120,380 250,380 250,420"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-border" strokeDasharray="5 5"
                />
                <motion.path
                  d="M 120,320 C 120,380 250,380 250,420"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-primary"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.2, ease: "easeInOut", delay: 1.8 }}
                />

                <motion.path
                  d="M 380,320 C 380,380 250,380 250,420"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-border" strokeDasharray="5 5"
                />
                <motion.path
                  d="M 380,320 C 380,380 250,380 250,420"
                  fill="transparent" strokeWidth="2" stroke="currentColor" className="text-purple-500"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.2, ease: "easeInOut", delay: 2.0 }}
                />
              </svg>

              {/* Trigger Block (Top Center) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="absolute top-[40px] left-1/2 -translate-x-1/2 bg-background border border-border shadow-lg rounded-xl p-4 w-[240px] z-10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <CheckSquare className="size-4 text-blue-500" />
                  </div>
                  <div className="text-sm font-semibold">When status changes</div>
                </div>
                <div className="bg-muted rounded border border-border px-3 py-1.5 text-xs flex justify-between items-center">
                  <span>In Progress</span>
                  <ArrowRight className="size-3" />
                  <span className="text-green-500 font-medium">Done</span>
                </div>
              </motion.div>

              {/* Action Block 1 (Left Middle) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 1.4 }}
                className="absolute top-[220px] left-0 bg-background border border-border shadow-lg rounded-xl p-4 w-[220px] z-10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Bell className="size-4 text-yellow-500" />
                  </div>
                  <div className="text-sm font-semibold">Send Slack Msg</div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border/50">
                  "Marketing Report completed!"
                </div>
              </motion.div>

              {/* Action Block 2 (Right Middle) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 1.6 }}
                className="absolute top-[220px] right-0 bg-background border border-border shadow-lg rounded-xl p-4 w-[220px] z-10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-purple-500" />
                  </div>
                  <div className="text-sm font-semibold">Update Parent</div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border/50">
                  Mark milestone as 100%
                </div>
              </motion.div>

              {/* Action Block 3 (Center Bottom) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 3.1 }}
                className="absolute top-[420px] left-1/2 -translate-x-1/2 bg-background border border-border shadow-lg rounded-xl p-4 w-[240px] z-10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-green-500" />
                  </div>
                  <div className="text-sm font-semibold">Move to List</div>
                </div>
                <div className="bg-muted rounded border border-border px-3 py-1.5 text-xs">
                  Review & Sign-off
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
