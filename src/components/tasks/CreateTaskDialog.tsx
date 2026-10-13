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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<Task>
}

export function CreateTaskDialog({ open, onOpenChange, defaultValues }: CreateTaskDialogProps) {
  const [isDirty, setIsDirty] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      setShowConfirm(true)
    } else {
      setIsDirty(false)
      onOpenChange(newOpen)
    }
  }

  const handleDiscard = () => {
    setShowConfirm(false)
    setIsDirty(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (isDirty) {
      setShowConfirm(true)
    } else {
      setIsDirty(false)
      onOpenChange(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[720px] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border">
          <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-sm">
            <DialogTitle className="text-xl font-semibold">
              {defaultValues?.id ? 'Edit Task' : 'Create Task'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {defaultValues?.id 
                ? 'Update the details for this task below.' 
                : 'Add a new task to your workspace. Fill out the details below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <TaskForm 
              defaultValues={defaultValues} 
              onSuccess={() => {
                setIsDirty(false)
                onOpenChange(false)
              }} 
              onCancel={handleCancel}
              onDirtyChange={setIsDirty}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved task?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this task. If you close now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
