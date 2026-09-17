"use client"

import * as React from "react"
import { Task } from "@/types"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, AlignLeft, MessageSquare, CheckSquare, Link as LinkIcon } from "lucide-react"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore } from "@/stores/data-store"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const { setSelectedTaskId } = useUIStore()
  const tasks = useDataStore(s => s.tasks);

  const subtasks = React.useMemo(() => tasks.filter(t => t.parentId === task.id), [tasks, task.id])
  const subtasksCount = subtasks.length
  const completedSubtasksCount = subtasks.filter(t => t.status === 'Done').length

  // Ensure priority color logic
  const priorityColor = {
    'Low': 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
    'Medium': 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400',
    'High': 'text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400',
    'Urgent': 'text-destructive bg-destructive/10 dark:bg-destructive/20 dark:text-red-400',
  }[task.priority]

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[120px] rounded-xl border-2 border-primary/50 bg-primary/10 opacity-50"
      />
    )
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing border-border hover:border-primary/40 hover:shadow-sm transition-all select-none ${isDragging ? 'opacity-30' : ''}`}
      onClick={(e) => {
        // Prevent click if we were dragging
        if (e.defaultPrevented) return
        setSelectedTaskId(task.id)
      }}
    >
      <CardContent className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.taskType && task.taskType !== 'Task' && (
            <Badge variant="outline" className="text-[9px] px-1 h-4 font-medium uppercase tracking-wider text-muted-foreground">
              {task.taskType}
            </Badge>
          )}
          <Badge variant="secondary" className={`text-[9px] px-1 h-4 font-medium uppercase tracking-wider ${priorityColor}`}>
            {task.priority}
          </Badge>
          {task.labels?.map(label => (
            <Badge key={label.id} variant="secondary" className={`text-[9px] px-1 h-4 font-medium uppercase tracking-wider ${label.color}`}>
              {label.name}
            </Badge>
          ))}
        </div>
        
        <p className="text-sm font-medium leading-tight">
          {task.title}
        </p>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-3 text-xs">
          {task.dueDate && (
            <div className="flex items-center gap-1 text-muted-foreground" title="Due date">
              <Calendar className="size-3" />
              <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-muted-foreground">
            {task.description && (
              <div title="Has description">
                <AlignLeft className="size-3" />
              </div>
            )}
            
            {subtasksCount > 0 && (
              <div className="flex items-center gap-1" title={`${completedSubtasksCount}/${subtasksCount} subtasks completed`}>
                <CheckSquare className="size-3" />
                <span className="text-[10px]">{completedSubtasksCount}/{subtasksCount}</span>
              </div>
            )}

            {(task.dependencies?.length || 0) > 0 && (
              <div className="flex items-center gap-1 text-orange-500/80" title={`${task.dependencies!.length} blocking dependencies`}>
                <LinkIcon className="size-3" />
              </div>
            )}
            {(task.blockedBy?.length || 0) > 0 && (
              <div className="flex items-center gap-1 text-blue-500/80" title={`Blocks ${task.blockedBy!.length} tasks`}>
                <LinkIcon className="size-3" />
              </div>
            )}
          </div>
        </div>

        {task?.assignee && (
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
              {task.assignee?.initials}
            </AvatarFallback>
          </Avatar>
        )}
      </CardFooter>
    </Card>
  )
}
