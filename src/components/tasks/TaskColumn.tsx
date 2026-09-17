"use client"

import * as React from "react"
import { Task, TaskStatus } from "@/types"
import { TaskCard } from "@/components/tasks/TaskCard"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

interface TaskColumnProps {
  title: TaskStatus
  tasks: Task[]
}

export function TaskColumn({ title, tasks }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: title,
    data: {
      type: "Column",
      column: title,
    },
  })

  return (
    <div className="flex flex-col w-72 sm:w-80 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium rounded-full h-5 px-2">
            {tasks.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
          <Plus className="size-4" />
        </Button>
      </div>
      
      <div 
        ref={setNodeRef}
        className={`flex-1 bg-muted/30 rounded-xl p-2 flex flex-col gap-2 min-h-[150px] transition-colors ${isOver ? 'bg-muted/50 ring-2 ring-primary/20' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-24 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}
