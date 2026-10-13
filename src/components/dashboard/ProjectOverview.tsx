import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ProjectOverview() {
  const projects = useDataStore(s => s.projects)
  const workspaceTasks = useDataStore(s => s.workspaceTasks)
  const activeProjects = projects.filter(p => p.status === 'Active').slice(0, 3)

  return (
    <Card className="col-span-1 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Project Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeProjects.map(project => {
            const projectTasks = workspaceTasks.filter(t => t.projectId === project.id)
            const taskCount = projectTasks.length > 0 
              ? projectTasks.length 
              : (workspaceTasks.length > 0 ? 0 : (project.taskCount ?? 0))
            const completedCount = projectTasks.filter(t => t.status === 'Done').length
            const progress = projectTasks.length > 0 
              ? Math.round((completedCount / projectTasks.length) * 100) 
              : (workspaceTasks.length > 0 ? 0 : (project.progress ?? 0))
            const colorClass = project.color || 'bg-primary'

            return (
              <div key={project.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`size-2.5 rounded-full ${colorClass}`} />
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
                
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClass} transition-all duration-300`} 
                    style={{ width: `${progress}%` }} 
                  />
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                  </span>
                  <div className="flex -space-x-2">
                    {project.members.map(member => (
                      <Avatar key={member.id} className="size-5 border-2 border-background">
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{member.initials}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
