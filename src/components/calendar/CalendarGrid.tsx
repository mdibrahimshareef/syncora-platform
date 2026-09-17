"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { useUIStore } from "@/stores/ui-store"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Task } from "@/types"

export function CalendarGrid() {
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const projects = useDataStore(s => s.projects);
  const workspaceMembers = useDataStore(s => s.workspaceMembers);
  const fetchWorkspaceTasks = useDataStore(s => s.fetchWorkspaceTasks);
  const fetchWorkspaceMembers = useDataStore(s => s.fetchWorkspaceMembers);
  const { setSelectedTaskId } = useUIStore()
  const [currentDate, setCurrentDate] = React.useState(new Date())

  React.useEffect(() => {
    fetchWorkspaceTasks()
    fetchWorkspaceMembers()
  }, [fetchWorkspaceTasks, fetchWorkspaceMembers])

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const today = () => {
    setCurrentDate(new Date())
  }

  // Generate calendar grid
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  
  const days = []
  // Pad beginning of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  // Add days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
  }

  const PRIORITY_COLORS = {
    'Low': 'bg-slate-500',
    'Medium': 'bg-amber-500',
    'High': 'bg-orange-500',
    'Urgent': 'bg-red-500'
  }

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={today}>Today</Button>
          <div className="flex items-center rounded-md border">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-l-md" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] h-full">
          {days.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="border-b border-r bg-muted/10 min-h-[120px]" />
            }

            const isToday = new Date().toDateString() === date.toDateString()
            
            // Find tasks for this day
            const dayTasks = workspaceTasks.filter(t => {
              if (!t.dueDate) return false
              const taskDate = new Date(t.dueDate)
              return taskDate.toDateString() === date.toDateString()
            })

            return (
              <div key={date.toISOString()} className="border-b border-r p-1.5 min-h-[120px] flex flex-col group hover:bg-muted/5 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                    {date.getDate()}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 overflow-y-auto max-h-full scrollbar-none">
                  {dayTasks.map(task => {
                    const project = projects.find(p => p.id === task.projectId)
                    return (
                      <div 
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`text-[10px] p-1.5 rounded-md border truncate cursor-pointer hover:border-primary/50 transition-colors ${task.status === 'Done' ? 'opacity-50 line-through bg-muted' : 'bg-card shadow-sm'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || 'bg-slate-500'}`} />
                          <span className="font-medium truncate">{task.title}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="truncate">{project?.name || 'Project'}</span>
                          {task.assignee?.id && (
                            <span className="shrink-0 font-medium text-[9px] bg-secondary px-1 rounded">
                              {workspaceMembers.find(m => m.id === task.assignee?.id)?.initials || '?'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
