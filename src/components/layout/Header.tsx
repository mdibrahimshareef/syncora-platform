"use client"

import * as React from "react"
import { Search, CheckCircle2, Settings, HelpCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore, useIsAdminOrOwner } from "@/stores/data-store"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"
import { NotificationCenter } from "@/components/navigation/NotificationCenter"
import { UserProfile } from "@/components/navigation/UserProfile"
import { UpgradePlanDialog } from "@/components/navigation/UpgradePlanDialog"
import { WorkspacePresenceAvatars } from "@/components/collaboration/WorkspacePresenceAvatars"
import { GlobalTimer } from "@/components/time-tracking/GlobalTimer"
import Link from "next/link"
import { useParams } from "next/navigation"

export function Header() {
  const { setCommandPaletteOpen } = useUIStore()
  const { organizations } = useOrganizationStore()
  const baseUrl = useWorkspaceUrl()
  const params = useParams()
  
  const currentOrg = organizations.find(o => o.slug === params.orgSlug)
  const isOrgAdmin = currentOrg?.role === 'admin' || currentOrg?.role === 'owner'

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2 overflow-hidden ml-2">
          <div className="size-6 bg-primary rounded-md flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight hidden sm:inline-block">
            SYNCORA
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex items-center">
        {/* Contextual Breadcrumb could go here based on route */}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden lg:block mr-2 border-r border-border pr-4">
          <WorkspacePresenceAvatars />
        </div>

        <Button 
          variant="outline" 
          className="w-full justify-start text-sm text-muted-foreground sm:w-64 sm:pr-12"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="mr-2 size-4" />
          <span className="hidden sm:inline-flex">Search workspace...</span>
          <span className="inline-flex sm:hidden">Search...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <GlobalTimer />

        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-2 text-indigo-500 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-800 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
          onClick={() => useUIStore.getState().setAIAssistantOpen(true)}
        >
          <Sparkles className="size-4" />
          <span className="hidden sm:inline-block">Ask AI</span>
        </Button>

        <UpgradePlanDialog />

        <NotificationCenter />
        
        {isOrgAdmin && (
          <Link href={`/${params.orgSlug}/admin`} className="hidden sm:flex">
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <Settings className="size-4" />
              <span>Admin Console</span>
            </Button>
          </Link>
        )}
        
        <Link href={`${baseUrl}/help`} className="hidden sm:flex">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Help">
            <HelpCircle className="size-5" />
          </Button>
        </Link>

        <div className="ml-1">
          <UserProfile />
        </div>
      </div>
    </header>
  )
}
