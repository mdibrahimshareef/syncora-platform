"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Sidebar } from "@/components/layout/Sidebar"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { Header } from "@/components/layout/Header"
import { CommandPalette } from "@/components/navigation/CommandPalette"
import { useDataStore } from "@/stores/data-store"
import { useWorkspaceRealtime } from "@/hooks/useWorkspaceRealtime"
import { TaskDetailsPanel } from "@/components/tasks/TaskDetailsPanel"
import { AIAssistant } from "@/components/ai/AIAssistant"
import { Loader2 } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const isLoading = useDataStore(s => s.isLoading);
  useWorkspaceRealtime(activeWorkspaceId || '')
  const pathname = usePathname()

  return (
    <SidebarProvider>
      {pathname.includes("/admin") ? <AdminSidebar collapsible="icon" /> : <Sidebar collapsible="icon" />}
      <SidebarInset className="min-w-0 overflow-hidden flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-auto min-h-0 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}
          <div className={`h-full ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
            {children}
          </div>
        </main>
      </SidebarInset>
      <CommandPalette />
      <TaskDetailsPanel />
      <AIAssistant />
    </SidebarProvider>
  )
}
