"use client"

import * as React from "react"
import { Project } from "@/types"
import { ProjectForm } from "@/components/projects/ProjectForm"
import {
  Dialog,
  DialogContent,
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
import { useDataStore } from "@/stores/data-store"
import { ChevronRight, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<Project>
}

export function CreateProjectDialog({ open, onOpenChange, defaultValues }: CreateProjectDialogProps) {
  const [isDirty, setIsDirty] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)
  const workspaces = useDataStore(s => s.workspaces)
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

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

  const handleSaveAsDraft = () => {
    toast.success("Draft saved locally")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent 
          className="sm:max-w-[900px] w-full max-w-[94vw] h-[640px] max-h-[88vh] flex flex-col p-0 overflow-hidden bg-background dark:bg-[#16171a] border border-border/70 dark:border-zinc-800 shadow-2xl rounded-2xl gap-0"
          overlayClassName="bg-black/25 dark:bg-black/45 backdrop-blur-none"
          showCloseButton={false}
        >
          {/* Linear Breadcrumb Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
                <div className="size-2 rounded-xs bg-primary/80" />
                <span className="truncate max-w-[180px]">{activeWorkspace?.name || "Workspace"}</span>
              </div>
              <ChevronRight className="size-3 text-muted-foreground/50" />
              <span className="text-foreground font-semibold">
                {defaultValues?.id ? 'Edit project' : 'New project'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSaveAsDraft}
                className="h-7 text-xs text-muted-foreground hover:text-foreground font-normal px-2.5 rounded-md"
              >
                Save as draft
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground font-normal px-2.5 rounded-md"
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Create with Agent</span>
              </Button>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Close (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Form Container (Fixed Height & Self-Contained) */}
          <div className="flex-1 min-h-0 flex flex-col">
            <ProjectForm 
              defaultValues={defaultValues} 
              onSuccess={() => {
                setIsDirty(false)
                onOpenChange(false)
              }}
              onDirtyChange={setIsDirty}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard the changes you&apos;ve made to this project?
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
