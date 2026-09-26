"use client"

import * as React from "react"
import { Project } from "@/types"
import { ProjectForm } from "@/components/projects/ProjectForm"
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

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<Project>
}

export function CreateProjectDialog({ open, onOpenChange, defaultValues }: CreateProjectDialogProps) {
  const [isDirty, setIsDirty] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      setShowConfirm(true)
    } else {
      onOpenChange(newOpen)
    }
  }

  const handleDiscard = () => {
    setShowConfirm(false)
    setIsDirty(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{defaultValues?.id ? 'Edit Project' : 'Create Project'}</DialogTitle>
            <DialogDescription>
              {defaultValues?.id 
                ? 'Update the details for this project below.' 
                : 'Add a new project to organize tasks in your workspace.'}
            </DialogDescription>
          </DialogHeader>
          <ProjectForm 
            defaultValues={defaultValues} 
            onSuccess={() => {
              setIsDirty(false)
              onOpenChange(false)
            }}
            onDirtyChange={setIsDirty}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard the changes you've made to this project?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
