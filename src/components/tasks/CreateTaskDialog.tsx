"use client"

import * as React from "react"
import { Task } from "@/types"
import { TaskForm } from "@/components/tasks/TaskForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<Task>
}

export function CreateTaskDialog({ open, onOpenChange, defaultValues }: CreateTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Edit Task' : 'Create Task'}</DialogTitle>
          <DialogDescription>
            {defaultValues?.id 
              ? 'Update the details for this task below.' 
              : 'Add a new task to your workspace. Fill out the details below.'}
          </DialogDescription>
        </DialogHeader>
        <TaskForm 
          defaultValues={defaultValues} 
          onSuccess={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  )
}
