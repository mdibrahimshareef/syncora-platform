import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Project, WorkflowStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Plus } from "lucide-react"

interface ProjectSettingsProps {
  project: Project
  projectStatuses?: WorkflowStatus[]
}

export function ProjectSettings({ project, projectStatuses }: ProjectSettingsProps) {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Settings className="size-5" /> Project Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage project workflows, statuses, and configurations.</p>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6">
        <div>
          <h3 className="text-md font-medium">Workflow Statuses</h3>
          <p className="text-sm text-muted-foreground mb-4">Define the custom stages for tasks in this project.</p>
        </div>
        
        {projectStatuses && projectStatuses.length > 0 ? (
          <div className="space-y-3">
            {projectStatuses.map((status, idx) => (
              <div key={status.id} className="flex items-center gap-4 bg-muted/30 p-3 rounded-md border">
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <div className={`size-3 rounded-full ${status.color || "bg-blue-500"}`} />
                    {status.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Category: {status.category} | Position: {idx + 1}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            This project uses the default workflow (Backlog, Todo, In Progress, Review, Done).
          </div>
        )}

        <Button variant="outline" size="sm" className="mt-4 pointer-events-none opacity-50">
          <Plus className="size-4 mr-2" /> Add Custom Status (Coming Soon)
        </Button>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6">
        <div>
          <h3 className="text-md font-medium">Project Budget</h3>
          <p className="text-sm text-muted-foreground mb-4">Set time and effort budgets for this project.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budget_minutes">Budget (Minutes)</Label>
            <Input id="budget_minutes" type="number" placeholder="e.g. 2400 (40 hours)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="warning_threshold">Warning Threshold (%)</Label>
            <Input id="warning_threshold" type="number" placeholder="e.g. 75" defaultValue="75" />
          </div>
        </div>
        <Button size="sm">Save Budget</Button>
      </div>
    </div>
  )
}
