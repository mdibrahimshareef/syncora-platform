"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle, Settings } from "lucide-react"
import { useDataStore } from "@/stores/data-store"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useRouter } from "next/navigation"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

import { CreateWorkspaceDialog } from "@/components/workspaces/CreateWorkspaceDialog"

export function WorkspaceSwitcher() {
  const workspaces = useDataStore(s => s.workspaces);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const { organizations } = useOrganizationStore()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const router = useRouter()
  const baseUrl = useWorkspaceUrl()

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const activeOrgName = organizations.find((o) => o.id === activeWorkspace?.organizationId)?.name

  const getInitial = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : "W"
  }

  const handleSwitchWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return

    // Set a cookie so the server knows which workspace to load next
    document.cookie = `SYNCORA_workspace_id=${workspaceId}; path=/; max-age=31536000`
    
    const targetWorkspace = workspaces.find(w => w.id === workspaceId)
    if (
      targetWorkspace && 
      targetWorkspace.orgSlug && targetWorkspace.orgSlug !== 'undefined' &&
      targetWorkspace.slug && targetWorkspace.slug !== 'undefined'
    ) {
      const teamSlug = targetWorkspace.teamSlug && targetWorkspace.teamSlug !== 'undefined' ? targetWorkspace.teamSlug : 'team'
      window.location.assign(`/${targetWorkspace.orgSlug}/${teamSlug}/${targetWorkspace.slug}`)
    } else {
      window.location.assign("/app")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <SidebarMenuButton 
            size="lg" 
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
              {getInitial(activeWorkspace?.name)}
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-semibold truncate max-w-[160px]">{activeWorkspace?.name || "Workspace"}</span>
              {activeOrgName && activeOrgName !== activeWorkspace?.name && (
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">{activeOrgName}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        } />
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground uppercase tracking-wider">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleSwitchWorkspace(workspace.id)}
              >
                <span className="truncate">{workspace.name}</span>
                {workspace.id === activeWorkspaceId && (
                  <Check className="size-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => router.push(`${baseUrl}/settings`)}
          >
            <Settings className="mr-2 size-4" />
            Workspace Settings
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <PlusCircle className="mr-2 size-4" />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  )
}
