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

export function AppShell({ children }: { children: React.ReactNode }) {
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  useWorkspaceRealtime(activeWorkspaceId || '')
  const pathname = usePathname()

  return (
    <SidebarProvider>
      {pathname.includes("/admin") ? <AdminSidebar collapsible="icon" /> : <Sidebar collapsible="icon" />}
      <SidebarInset className="min-w-0 overflow-hidden flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-auto min-h-0">
          {children}
        </main>
      </SidebarInset>
      <CommandPalette />
      <TaskDetailsPanel />
      <AIAssistant />
    </SidebarProvider>
  )
}
