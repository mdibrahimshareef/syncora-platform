"use client"

import * as React from "react"
import { Task } from "@/types"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, AlignLeft, MessageSquare, CheckSquare, Link as LinkIcon, MoreHorizontal } from "lucide-react"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore } from "@/stores/data-store"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const { setSelectedTaskId } = useUIStore()
  const tasks = useDataStore(s => s.tasks);
  const moveTask = useDataStore(s => s.moveTask);
  const projectStatuses = useDataStore(s => s.projectStatuses);

  const subtasks = React.useMemo(() => tasks.filter(t => t.parentId === task.id), [tasks, task.id])
  const subtasksCount = subtasks.length
  const completedSubtasksCount = subtasks.filter(t => t.status === 'Done').length

  const DEFAULT_COLUMNS = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
  const columns = projectStatuses && projectStatuses.length > 0 ? projectStatuses.map(s => s.name) : DEFAULT_COLUMNS;

  // Ensure priority color logic
  const priorityColor = {
    'Low': 'text-slate-600 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300',
    'Medium': 'text-blue-700 bg-blue-100 dark:bg-blue-900/60 dark:text-blue-300',
    'High': 'text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300',
    'Urgent': 'text-destructive bg-destructive/10 dark:bg-destructive/20 dark:text-red-300',
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
      tabIndex={0}
      className={`cursor-grab active:cursor-grabbing border-border hover:border-primary/40 hover:shadow-sm transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isDragging ? 'opacity-30' : ''}`}
      onClick={(e) => {
        // Prevent click if we were dragging
        if (e.defaultPrevented) return
        setSelectedTaskId(task.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setSelectedTaskId(task.id)
        }
      }}
    >
      <CardContent className="p-3 space-y-2.5 relative">
        <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <span className="sr-only">Open task menu</span>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Move to...</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map(status => (
                <DropdownMenuItem 
                  key={status} 
                  disabled={task.status === status}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTask(task.id, status as any);
                  }}
                >
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pr-8">
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
