"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutGrid, List, Calendar, Clock } from "lucide-react"

const views = [
  { id: "board", label: "Board", icon: LayoutGrid, color: "bg-blue-500" },
  { id: "list", label: "List", icon: List, color: "bg-green-500" },
  { id: "calendar", label: "Calendar", icon: Calendar, color: "bg-purple-500" },
]

export function ViewsShowcase() {
  const [activeView, setActiveView] = useState(views[0].id)

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Plan work <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">your way</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Different teams need different perspectives. Switch between views instantly to see your work exactly how you want.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-muted/50 rounded-full inline-flex mx-auto">
            {views.map((view) => {
              const isActive = activeView === view.id
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  aria-label={`Switch to ${view.label} view`}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <view.icon className={`size-4 ${isActive ? "text-primary" : ""}`} aria-hidden="true" />
                  {view.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="max-w-5xl mx-auto relative h-[500px] w-full rounded-2xl border border-border bg-muted/20 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-12 border-b border-border bg-background/50 flex items-center px-4">
            <div className="flex gap-2">
              <div className="size-3 rounded-full bg-border" />
              <div className="size-3 rounded-full bg-border" />
              <div className="size-3 rounded-full bg-border" />
            </div>
          </div>
          
          <div className="pt-12 h-full w-full p-6">
            <AnimatePresence mode="wait">
              {activeView === "board" && (
                <motion.div
                  key="board"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full flex gap-6 overflow-hidden"
                >
                  {/* To Do Column */}
                  <div className="flex-1 max-w-[300px] bg-muted/50 rounded-xl p-4 flex flex-col gap-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm flex items-center gap-2"><div className="size-2 rounded-full bg-slate-400" /> To Do</div>
                      <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">2</span>
                    </div>
                    <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
                      <div className="flex gap-2 mb-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-medium">Design</span></div>
                      <div className="text-sm font-medium mb-3">Design landing page</div>
                      <div className="flex justify-between items-center">
                        <div className="flex -space-x-1"><div className="size-6 rounded-full border-2 border-background bg-purple-500 flex items-center justify-center text-[10px] text-white">S</div></div>
                        <span className="text-xs text-muted-foreground">Oct 12</span>
                      </div>
                    </div>
                    <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
                      <div className="flex gap-2 mb-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-medium">Bug</span></div>
                      <div className="text-sm font-medium mb-3">Fix navigation bug</div>
                      <div className="flex justify-between items-center">
                        <div className="flex -space-x-1"><div className="size-6 rounded-full border-2 border-background bg-blue-500 flex items-center justify-center text-[10px] text-white">M</div></div>
                        <span className="text-xs text-muted-foreground">Oct 14</span>
                      </div>
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div className="flex-1 max-w-[300px] bg-muted/50 rounded-xl p-4 flex flex-col gap-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm flex items-center gap-2"><div className="size-2 rounded-full bg-blue-500" /> In Progress</div>
                      <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">1</span>
                    </div>
                    <div className="bg-background border border-border p-3 rounded-lg shadow-sm">
                      <div className="flex gap-2 mb-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-medium">Product</span></div>
                      <div className="text-sm font-medium mb-3">Update user onboarding</div>
                      <div className="flex justify-between items-center">
                        <div className="flex -space-x-1"><div className="size-6 rounded-full border-2 border-background bg-green-500 flex items-center justify-center text-[10px] text-white">E</div></div>
                        <span className="text-xs text-muted-foreground">Oct 16</span>
                      </div>
                    </div>
                  </div>

                  {/* Done Column */}
                  <div className="flex-1 max-w-[300px] bg-muted/50 rounded-xl p-4 flex flex-col gap-4 border border-border/50 opacity-80">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm flex items-center gap-2"><div className="size-2 rounded-full bg-green-500" /> Done</div>
                      <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">1</span>
                    </div>
                    <div className="bg-background border border-border p-3 rounded-lg shadow-sm opacity-70">
                      <div className="flex gap-2 mb-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-medium">Content</span></div>
                      <div className="text-sm font-medium mb-3 line-through">Draft Q3 Report</div>
                      <div className="flex justify-between items-center">
                        <div className="flex -space-x-1"><div className="size-6 rounded-full border-2 border-background bg-purple-500 flex items-center justify-center text-[10px] text-white">S</div></div>
                        <span className="text-xs text-muted-foreground">Oct 05</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === "list" && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full flex flex-col gap-2 overflow-y-auto overflow-x-auto pr-2"
                >
                  <div className="flex items-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border min-w-[500px]">
                    <div className="flex-1">Task name</div>
                    <div className="w-24 sm:w-32">Assignee</div>
                    <div className="w-24 sm:w-32">Due Date</div>
                    <div className="w-28 sm:w-32">Status</div>
                  </div>
                  
                  {[
                    { name: "Design landing page", assignee: "S", color: "bg-purple-500", date: "Oct 12", status: "To Do", statusColor: "bg-slate-500/10 text-slate-500" },
                    { name: "Update user onboarding", assignee: "E", color: "bg-green-500", date: "Oct 16", status: "In Progress", statusColor: "bg-blue-500/10 text-blue-500" },
                    { name: "Fix navigation bug", assignee: "M", color: "bg-blue-500", date: "Oct 14", status: "To Do", statusColor: "bg-slate-500/10 text-slate-500" },
                    { name: "Draft Q3 Report", assignee: "S", color: "bg-purple-500", date: "Oct 05", status: "Done", statusColor: "bg-green-500/10 text-green-500", done: true },
                    { name: "Client review meeting", assignee: "M", color: "bg-blue-500", date: "Oct 20", status: "In Progress", statusColor: "bg-blue-500/10 text-blue-500" },
                  ].map((task, i) => (
                    <div key={i} className={`flex items-center px-4 py-3 bg-background border border-border rounded-lg shadow-sm hover:border-primary/50 transition-colors min-w-[500px] ${task.done ? "opacity-60" : ""}`}>
                      <div className="flex-1 flex items-center gap-3">
                        <div className={`size-4 rounded-full border-2 flex-shrink-0 ${task.done ? "bg-green-500 border-green-500" : "border-muted-foreground/30"}`} />
                        <span className={`text-sm font-medium truncate ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.name}</span>
                      </div>
                      <div className="w-24 sm:w-32 flex items-center gap-2">
                        <div className={`size-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] text-white ${task.color}`}>{task.assignee}</div>
                      </div>
                      <div className="w-24 sm:w-32">
                        <span className="text-sm text-muted-foreground">{task.date}</span>
                      </div>
                      <div className="w-28 sm:w-32">
                        <span className={`text-xs px-2 py-1 rounded-md font-medium truncate ${task.statusColor}`}>{task.status}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeView === "calendar" && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full bg-background border border-border rounded-lg overflow-hidden flex flex-col shadow-sm"
                >
                  <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-0">{day}</div>
                    ))}
                  </div>
                  <div className="flex-1 grid grid-cols-7 grid-rows-5">
                    {[...Array(35)].map((_, i) => {
                      const day = i + 1;
                      return (
                        <div key={i} className="border-r border-b border-border last:border-r-0 relative p-1 hover:bg-muted/10 transition-colors">
                          <div className={`text-xs p-1 ${day === 14 ? "bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center" : "text-muted-foreground"}`}>
                            {day <= 31 ? day : ""}
                          </div>
                          {day === 12 && (
                            <div className="absolute top-8 left-1 right-1 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] px-1 py-0.5 text-purple-600 dark:text-purple-400 font-medium truncate">Design landing page</div>
                          )}
                          {day === 14 && (
                            <div className="absolute top-8 left-1 right-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] px-1 py-0.5 text-red-600 dark:text-red-400 font-medium truncate">Fix navigation bug</div>
                          )}
                          {day === 16 && (
                            <div className="absolute top-8 left-1 right-1 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] px-1 py-0.5 text-blue-600 dark:text-blue-400 font-medium truncate">Update onboarding</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
