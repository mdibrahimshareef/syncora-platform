"use client"

import { motion } from "framer-motion"
import { Hash, Code2, PenTool, LayoutDashboard, Globe, Box, Database, AppWindow, FileText, Calendar } from "lucide-react"

export function IntegrationsShowcase() {
  const integrations = [
    { name: "Slack", icon: Hash, color: "text-blue-500" },
    { name: "GitHub", icon: Code2, color: "text-foreground" },
    { name: "Figma", icon: PenTool, color: "text-pink-500" },
    { name: "Jira", icon: LayoutDashboard, color: "text-blue-600" },
    { name: "Google Workspace", icon: Globe, color: "text-green-500" },
    { name: "Notion", icon: FileText, color: "text-foreground" },
    { name: "Dropbox", icon: Box, color: "text-blue-400" },
    { name: "Microsoft Teams", icon: AppWindow, color: "text-indigo-500" },
    { name: "Calendly", icon: Calendar, color: "text-blue-500" },
    { name: "Snowflake", icon: Database, color: "text-cyan-500" },
  ]

  return (
    <section className="py-24 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Integrates with your entire stack
        </h2>
        <p className="text-lg text-muted-foreground mb-16">
          SYNCORA connects seamlessly with over 100+ tools you already use. Keep your workflows automated and your data perfectly synced across your enterprise ecosystem.
        </p>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8 lg:gap-12">
          {integrations.map((integration, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/50 hover:border-border/80 hover:shadow-lg transition-all w-28 md:w-32 cursor-pointer group"
            >
              <div className={`p-3 rounded-xl bg-background shadow-sm border border-border/50 group-hover:shadow-md transition-all ${integration.color}`}>
                <integration.icon className="size-8 md:size-10" />
              </div>
              <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {integration.name}
              </span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
