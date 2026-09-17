"use client"

import { motion } from "framer-motion"
import { CheckSquare, Folders, Users, GitMerge, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const features = [
  {
    title: "Project Management",
    description: "Organize work into shared projects. Set goals, timelines, and keep everyone aligned.",
    icon: Folders,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Task Tracking",
    description: "Break big projects down into manageable tasks. Assign owners, set due dates, and track progress.",
    icon: CheckSquare,
    color: "bg-green-500/10 text-green-500",
  },
  {
    title: "Team Collaboration",
    description: "Communicate directly on tasks. Share files, leave comments, and reduce status meetings.",
    icon: Users,
    color: "bg-purple-500/10 text-purple-500",
  },
]

export function ValueProposition() {
  return (
    <section id="product" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Decorative lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 opacity-50" />
        <div className="absolute left-1/2 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-border to-transparent -translate-x-1/2 opacity-50" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            One workspace. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Everything connected.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Stop switching between spreadsheets, chat apps, and email. SYNCORA brings your team's work together in one unified platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-background rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
            >
              <div className={`size-12 rounded-xl ${feature.color} flex items-center justify-center mb-6`}>
                <feature.icon className="size-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {feature.description}
              </p>
              <Link href="/signup" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                Explore {feature.title.toLowerCase()}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-20 max-w-4xl mx-auto bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-8 md:p-12 border border-primary/20 text-center flex flex-col items-center"
        >
          <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <GitMerge className="size-8 text-primary" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Connect the dots across your organization</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            When work is connected, teams move faster. See how engineering, marketing, and sales can finally collaborate in the same tool without stepping on each other's toes.
          </p>
          <Link href="/signup">
            <Button size="lg" className="rounded-full">Start connecting your team</Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
