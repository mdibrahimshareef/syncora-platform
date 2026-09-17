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

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<Project>
}

export function CreateProjectDialog({ open, onOpenChange, defaultValues }: CreateProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          onSuccess={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  )
}
