"use client"

import * as React from "react"
import { Project, Task, Milestone } from "@/types"
import { useDataStore } from "@/stores/data-store"
import { useUIStore } from "@/stores/ui-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, CheckCircle2, CircleDashed, Clock, AlertTriangle, Target, Plus, MoreHorizontal } from "lucide-react"
import { format, isPast, isToday } from "date-fns"

interface ProjectOverviewProps {
  project: Project
  tasks: Task[]
}

export function ProjectOverview({ project, tasks }: ProjectOverviewProps) {
  const milestones = useDataStore(s => s.milestones);
  const createMilestone = useDataStore(s => s.createMilestone);
  const { setSelectedTaskId } = useUIStore()
  
  const projectMilestones = milestones.filter(m => m.projectId === project.id)

  const completedTasks = tasks.filter(t => t.status === 'Done')
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress' || t.status === 'Review')
  const overdueTasks = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== 'Done')
  const blockedTasks = tasks.filter(t => (t.dependencies?.length || 0) > 0 && t.status !== 'Done')

  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide py-6 h-full">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionPercentage}%</div>
              <Progress value={completionPercentage} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">{completedTasks.length} of {tasks.length} tasks done</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center"><CircleDashed className="w-3 h-3 mr-1" /> Active work</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center"><Clock className="w-3 h-3 mr-1" /> Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{blockedTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Waiting on others</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Milestones */}
          <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Milestones</CardTitle>
                <CardDescription>Key phases and targets for this project</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                const name = window.prompt("Milestone Name:")
                if (name) {
                  createMilestone(project.id, { name })
                }
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {projectMilestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No milestones defined yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projectMilestones.map(m => {
                    const mTasks = tasks.filter(t => t.milestoneId === m.id)
                    const mCompleted = mTasks.filter(t => t.status === 'Done')
                    const mProgress = mTasks.length > 0 ? Math.round((mCompleted.length / mTasks.length) * 100) : 0
                    
                    return (
                      <div key={m.id} className="p-4 border rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium flex items-center">
                            {m.status === 'Completed' ? <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> : <Target className="w-4 h-4 text-primary mr-2" />}
                            {m.name}
                          </h4>
                          {m.dueDate && (
                            <span className="text-xs bg-muted px-2 py-1 rounded flex items-center">
                              <Calendar className="w-3 h-3 mr-1" /> {format(new Date(m.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        {m.description && <p className="text-xs text-muted-foreground mb-3">{m.description}</p>}
                        
                        <div className="flex items-center gap-3 mt-2">
                          <Progress value={mProgress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-8 text-right">{mProgress}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks
                  .filter(t => t.dueDate && t.status !== 'Done')
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .slice(0, 5)
                  .map(t => (
                    <div key={t.id} className="flex items-start justify-between cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded transition-colors" onClick={() => setSelectedTaskId(t.id)}>
                      <div className="truncate pr-2">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(t.dueDate!), 'MMM d')}</p>
                      </div>
                      <div className="shrink-0">
                        {isPast(new Date(t.dueDate!)) && !isToday(new Date(t.dueDate!)) ? (
                          <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">Overdue</span>
                        ) : (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{t.status}</span>
                        )}
                      </div>
                    </div>
                  ))
                }
                
                {tasks.filter(t => t.dueDate && t.status !== 'Done').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
