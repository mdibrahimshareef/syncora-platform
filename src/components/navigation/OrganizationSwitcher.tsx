"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle, Settings, Building2 } from "lucide-react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useParams, useRouter } from "next/navigation"

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

// We will build CreateOrganizationDialog next
// import { CreateOrganizationDialog } from "@/components/organizations/CreateOrganizationDialog"

export function OrganizationSwitcher() {
  const { organizations, activeOrganizationId } = useOrganizationStore()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const router = useRouter()
  const params = useParams()

  const activeOrganization = organizations.find((o) => o.id === activeOrganizationId)

  const getInitial = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : "O"
  }

  const handleSwitchOrganization = (orgId: string) => {
    if (orgId === activeOrganizationId) return

    // Set a cookie so the server knows which organization to load next
    document.cookie = `SYNCORA_org_id=${orgId}; path=/; max-age=31536000`
    
    // Force a full reload to clear all states and re-initialize from server layout
    window.location.assign("/")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <SidebarMenuButton 
            size="lg" 
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20">
              {activeOrganization ? getInitial(activeOrganization.name) : <Building2 className="size-4" />}
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-semibold">{activeOrganization?.name || "Organization"}</span>
              <span className="text-xs text-muted-foreground">Enterprise Plan</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        } />
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground uppercase tracking-wider">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleSwitchOrganization(org.id)}
              >
                <span className="truncate">{org.name}</span>
                {org.id === activeOrganizationId && (
                  <Check className="size-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => router.push(`/${activeOrganization?.slug || params.orgSlug || 'org'}/settings`)}
          >
            <Settings className="mr-2 size-4" />
            Organization Settings
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <PlusCircle className="mr-2 size-4" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* <CreateOrganizationDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      /> */}
    </>
  )
}
