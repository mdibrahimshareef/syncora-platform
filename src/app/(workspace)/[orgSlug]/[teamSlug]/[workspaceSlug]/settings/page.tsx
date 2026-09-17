import { Settings as SettingsIcon } from "lucide-react"
import { WorkspaceMembers } from "@/components/settings/WorkspaceMembers"
import { WorkspaceSettingsForm } from "@/components/settings/WorkspaceSettingsForm"

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 h-full flex flex-col">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Workspace Settings</h2>
        <p className="text-muted-foreground">
          Manage your workspace members, roles, and preferences.
        </p>
      </div>
      
      <div className="mt-6 pt-2">
        <WorkspaceSettingsForm />
      </div>

      <div className="mt-8 border-t pt-6">
        <WorkspaceMembers />
      </div>
    </div>
  )
}
