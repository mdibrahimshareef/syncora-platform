import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"

export function MyTasks() {
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const currentUser = useDataStore(s => s.currentUser);
  const tasks = workspaceTasks.filter(t => t.assignee?.id === currentUser?.id).slice(0, 5)

  return (
    <Card className="col-span-1 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-medium">My Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <div key={task.id} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                <div className="mt-0.5">
                  {task.status === 'Done' ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : task.priority === 'Urgent' ? (
                    <AlertCircle className="size-4 text-destructive" />
                  ) : (
                    <Clock className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{task.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal">
                      {task.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(task.dueDate || task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6">
              No assigned tasks.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
