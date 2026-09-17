import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  ArrowLeft,
  Activity, 
  LineChart, 
  FileText, 
  Zap, 
  UserCheck, 
  Globe, 
  Megaphone, 
  DownloadCloud, 
  Users, 
  Shield, 
  CreditCard, 
  ExternalLink 
} from "lucide-react"

import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"

export function AdminSidebar({ ...props }: React.ComponentProps<typeof ShadcnSidebar>) {
  const pathname = usePathname()
  const baseUrl = useWorkspaceUrl()

  return (
    <ShadcnSidebar {...props}>
      <SidebarHeader className="h-14 flex flex-row items-center gap-2 border-b px-4 border-border">
        <Link href={baseUrl || "/app"} className="flex items-center justify-center p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="font-semibold text-sm">Global Administration</span>
      </SidebarHeader>

      <SidebarContent>
        {/* Monitoring */}
        <SidebarGroup>
          <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Mission control">
                  <Activity />
                  <span>Mission control</span>
                  <Badge variant="secondary" className="ml-auto h-5 bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 font-normal text-[10px]">Premium</Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Analytics">
                  <LineChart />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Audit log">
                  <FileText />
                  <span>Audit log</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Admin tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Automation">
                  <Zap />
                  <span>Automation</span>
                  <Badge variant="secondary" className="ml-auto h-5 bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 font-normal text-[10px]">Premium</Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="User access audit">
                  <UserCheck />
                  <span>User access audit</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Spaces">
                  <Globe />
                  <span>Spaces</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Announcements">
                  <Megaphone />
                  <span>Announcements</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Import from other tools">
                  <DownloadCloud />
                  <span>Import from other tools</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Global Administration */}
        <SidebarGroup>
          <SidebarGroupLabel>Global Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="User management" className="justify-between">
                  <div className="flex items-center gap-2">
                    <Users />
                    <span>User management</span>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Groups" className="justify-between">
                  <div className="flex items-center gap-2">
                    <Shield />
                    <span>Groups</span>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Billing" className="justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard />
                    <span>Billing</span>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
      <SidebarRail />
    </ShadcnSidebar>
  )
}
