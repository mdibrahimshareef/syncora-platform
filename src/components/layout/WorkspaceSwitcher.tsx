"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle, Settings, Building2 } from "lucide-react"
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
import { CreateOrganizationDialog } from "@/components/organizations/CreateOrganizationDialog"

function switchWorkspace(workspaceId: string, targetPath: string) {
  document.cookie = `SYNCORA_workspace_id=${workspaceId}; path=/; max-age=31536000`
  window.location.assign(targetPath)
}

function switchOrganization(orgId: string) {
  document.cookie = `SYNCORA_org_id=${orgId}; path=/; max-age=31536000`
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/app")
}

export function WorkspaceSwitcher() {
  const workspaces = useDataStore(s => s.workspaces);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const { organizations } = useOrganizationStore()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = React.useState(false)
  const router = useRouter()
  const baseUrl = useWorkspaceUrl()

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const activeOrg = organizations.find((o) => o.id === activeWorkspace?.organizationId)
  const activeOrgName = activeOrg?.name

  const getInitial = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : "W"
  }

  const handleSwitchWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return

    const targetWorkspace = workspaces.find(w => w.id === workspaceId)
    const targetPath = (
      targetWorkspace && 
      targetWorkspace.orgSlug && targetWorkspace.orgSlug !== 'undefined' &&
      targetWorkspace.slug && targetWorkspace.slug !== 'undefined'
    ) 
      ? `/${targetWorkspace.orgSlug}/${targetWorkspace.teamSlug && targetWorkspace.teamSlug !== 'undefined' ? targetWorkspace.teamSlug : 'team'}/${targetWorkspace.slug}`
      : "/app"

    switchWorkspace(workspaceId, targetPath)
  }

  const handleSwitchOrganization = (orgId: string) => {
    if (orgId === activeWorkspace?.organizationId) return
    switchOrganization(orgId)
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
              {activeOrgName && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[160px] font-normal">
                  {activeOrgName}
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        } />
        <DropdownMenuContent align="start" className="w-[250px]">
          {/* Workspaces Section */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
          <DropdownMenuItem 
            className="cursor-pointer text-xs"
            onClick={() => router.push(`${baseUrl}/settings`)}
          >
            <Settings className="mr-2 size-3.5" />
            Workspace Settings
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer text-xs"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <PlusCircle className="mr-2 size-3.5" />
            Create Workspace
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Organizations Section */}
          <DropdownMenuGroup>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Building2 className="size-3" /> Organization
              </span>
              {activeOrgName && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">
                  {activeOrgName}
                </span>
              )}
            </div>

            {organizations.length > 1 && organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="flex items-center justify-between cursor-pointer text-xs"
                onClick={() => handleSwitchOrganization(org.id)}
              >
                <span className="truncate">{org.name}</span>
                {org.id === activeWorkspace?.organizationId && (
                  <Check className="size-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuItem 
              className="cursor-pointer text-xs"
              onClick={() => router.push(`/${activeOrg?.slug || 'org'}/settings`)}
            >
              <Settings className="mr-2 size-3.5" />
              Organization Settings
            </DropdownMenuItem>

            <DropdownMenuItem 
              className="cursor-pointer text-xs"
              onClick={() => setIsCreateOrgDialogOpen(true)}
            >
              <PlusCircle className="mr-2 size-3.5" />
              Create Organization
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />

      <CreateOrganizationDialog 
        open={isCreateOrgDialogOpen} 
        onOpenChange={setIsCreateOrgDialogOpen} 
      />
    </>
  )
}
