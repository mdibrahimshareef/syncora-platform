"use client"

import * as React from "react"
import { Search, HelpCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useUIStore } from "@/stores/ui-store"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"
import { NotificationCenter } from "@/components/navigation/NotificationCenter"
import { UserProfile } from "@/components/navigation/UserProfile"
import { GlobalTimer } from "@/components/time-tracking/GlobalTimer"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export function Header() {
  const { setCommandPaletteOpen } = useUIStore()
  const baseUrl = useWorkspaceUrl()

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      {/* Left: Sidebar trigger & Brand */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2 overflow-hidden ml-2">
          <Logo className="size-6 text-primary" />
          <span className="font-semibold text-lg tracking-tight hidden sm:inline-block">
            SYNCORA
          </span>
        </div>
      </div>
      
      {/* Center: Core Utilities (Search, Timer, Ask AI) */}
      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto gap-2 sm:gap-3 px-2">
        <Button 
          variant="outline" 
          size="sm"
          className="relative w-9 px-0 sm:w-64 sm:px-4 sm:justify-start text-sm text-muted-foreground sm:pr-12"
          onClick={() => setCommandPaletteOpen(true)}
          title="Search workspace"
        >
          <Search className="size-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only sm:inline-flex">Search workspace...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <GlobalTimer />

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 w-9 px-0 sm:w-auto sm:px-3 gap-2 text-primary hover:bg-primary/10 hover:text-primary active:bg-primary/15 transition-colors border-0 shadow-none font-medium"
          onClick={() => useUIStore.getState().setAIAssistantOpen(true)}
          title="Ask AI"
        >
          <Sparkles className="size-4 text-primary" />
          <span className="sr-only sm:not-sr-only sm:inline-block font-medium">Ask AI</span>
        </Button>
      </div>

      {/* Right: Notifications, Help, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <NotificationCenter />
        
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
