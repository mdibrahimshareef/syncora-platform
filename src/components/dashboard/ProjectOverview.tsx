import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ProjectOverview() {
  const projects = useDataStore(s => s.projects);
  const activeProjects = projects.filter(p => p.status === 'Active').slice(0, 3)

  return (
    <Card className="col-span-1 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Project Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeProjects.map(project => (
            <div key={project.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`size-2.5 rounded-full ${project.color}`} />
                  <span className="text-sm font-medium">{project.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{project.progress}%</span>
              </div>
              
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full ${project.color}`} 
                  style={{ width: `${project.progress}%` }} 
                />
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{project.taskCount} tasks</span>
                <div className="flex -space-x-2">
                  {project.members.map(member => (
                    <Avatar key={member.id} className="size-5 border-2 border-background">
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{member.initials}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
