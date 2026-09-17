"use client"

import { motion } from "framer-motion"
import { Sparkles, Bot, Zap, MessageSquare, Workflow } from "lucide-react"

export function AISection() {
  return (
    <section className="relative overflow-hidden bg-primary py-24 sm:py-32">
      {/* Decorative stars/sparkles background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 animate-pulse"><Sparkles className="text-white size-6" /></div>
        <div className="absolute top-3/4 left-1/3 animate-pulse delay-700"><Sparkles className="text-white size-4" /></div>
        <div className="absolute top-1/3 right-1/4 animate-pulse delay-300"><Sparkles className="text-white size-8" /></div>
        <div className="absolute top-2/3 right-1/3 animate-pulse delay-1000"><Sparkles className="text-white size-5" /></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl"
          >
            Reimagine what's possible <br className="hidden sm:block" />
            with AI and agents
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-lg leading-8 text-primary-foreground/80 max-w-2xl mx-auto"
          >
            SYNCORA connects your team, and our AI agents multiply what they can do. 
            Automate routine tasks, get instant answers, and scale your productivity effortlessly.
          </motion.p>
        </div>

        {/* Feature Pills */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-12 flex flex-wrap justify-center gap-4 max-w-3xl mx-auto"
        >
          <div className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm">
            <Bot className="size-4" />
            Ask SYNCORABot
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-5 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm border border-primary-foreground/20">
            <Zap className="size-4" />
            Automate workflows
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-5 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm border border-primary-foreground/20">
            <MessageSquare className="size-4" />
            Summarize threads
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-5 py-2.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm border border-primary-foreground/20">
            <Workflow className="size-4" />
            Plan project launches
          </div>
        </motion.div>

        {/* Mockup UI Window */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 relative mx-auto max-w-4xl"
        >
          <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="rounded-lg bg-background shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-rose-500/80" />
                  <div className="size-3 rounded-full bg-amber-500/80" />
                  <div className="size-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-6 w-full max-w-md rounded-md bg-muted flex items-center px-3 gap-2 text-xs text-muted-foreground border border-border/50 shadow-inner">
                    <Sparkles className="size-3 text-primary" />
                    Ask SYNCORABot to analyze this week's progress...
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8 flex flex-col gap-6 bg-card min-h-[300px]">
                {/* Chat Mockup */}
                <div className="flex gap-4 items-start">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">You</span>
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-foreground max-w-[80%]">
                    Can you draft a project update for the Q3 Launch based on the completed tasks?
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="size-4 text-primary-foreground" />
                  </div>
                  <div className="bg-primary/5 border border-primary/10 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-foreground max-w-[80%] shadow-sm">
                    <p className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <Sparkles className="size-3" /> SYNCORABot
                    </p>
                    <p className="text-muted-foreground">Here is a summary of the Q3 Launch progress:</p>
                    <ul className="mt-2 space-y-1 list-disc pl-4 text-muted-foreground">
                      <li><span className="text-foreground font-medium">Design phase</span> is 100% complete.</li>
                      <li><span className="text-foreground font-medium">Backend API</span> merged yesterday (3 days ahead of schedule).</li>
                      <li><span className="text-foreground font-medium">Marketing assets</span> are currently in review.</li>
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                        Post to channel
                      </span>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                        Regenerate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
