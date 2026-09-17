import * as React from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { LayoutDashboard, Inbox, CheckSquare, Calendar, PlusCircle, Folders, Users, Target, Briefcase, Flag, FileText, Send, CheckCircle, Building2, PieChart, ShieldAlert, Blocks } from "lucide-react"

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
import { useDataStore } from "@/stores/data-store"
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher"
import { GlobalSearch } from "@/components/navigation/GlobalSearch"

export function Sidebar({ ...props }: React.ComponentProps<typeof ShadcnSidebar>) {
  const pathname = usePathname()
  const params = useParams()
  const projects = useDataStore(s => s.projects);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const workspaces = useDataStore(s => s.workspaces);
  const unreadNotificationCount = useDataStore(s => s.unreadNotificationCount);
  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

  // Base URL for the workspace context
  // Fall back to currentWorkspace if params are missing or corrupted (e.g. string "undefined")
  let baseUrl = '/app'
  if (params?.orgSlug && params.orgSlug !== 'undefined') {
    baseUrl = `/${params.orgSlug}/${params.teamSlug || ''}/${params.workspaceSlug || ''}`.replace(/\/+/g, '/').replace(/\/$/, '')
  } else if (currentWorkspace && currentWorkspace.orgSlug) {
    baseUrl = `/${currentWorkspace.orgSlug}/${currentWorkspace.teamSlug || 'team'}/${currentWorkspace.slug}`
  }

  const navigationGroups = [
    {
      label: "WORK",
      items: [
        { name: "Home", href: baseUrl || "/app", icon: LayoutDashboard },
        { name: "Inbox", href: `${baseUrl || "/app"}/inbox`, icon: Inbox, badge: unreadNotificationCount > 0 ? unreadNotificationCount : null },
        { name: "My Work", href: `${baseUrl || "/app"}/my-tasks`, icon: CheckSquare },
        { name: "Requests", href: `${baseUrl || "/app"}/requests`, icon: Send },
        { name: "Approvals", href: `${baseUrl || "/app"}/approvals`, icon: CheckCircle },
      ]
    },
    {
      label: "PLAN",
      items: [
        { name: "Portfolios", href: `${baseUrl || "/app"}/portfolios`, icon: Briefcase },
        { name: "Initiatives", href: `${baseUrl || "/app"}/initiatives`, icon: Target },
        { name: "Projects", href: `${baseUrl || "/app"}/projects`, icon: Folders },
      ]
    },
    {
      label: "COLLABORATE",
      items: [
        { name: "Docs", href: `${baseUrl || "/app"}/docs`, icon: FileText },
        { name: "Calendar", href: `${baseUrl || "/app"}/calendar`, icon: Calendar },
      ]
    },
    {
      label: "INSIGHTS",
      items: [
        { name: "Reports", href: `${baseUrl || "/app"}/reports`, icon: PieChart },
        { name: "Workload", href: `${baseUrl || "/app"}/workload`, icon: Users },
      ]
    },
    {
      label: "ORGANIZATION",
      items: [
        { name: "Automations", href: `${baseUrl || "/app"}/automations`, icon: Blocks },
      ]
    }
  ]

  return (
    <ShadcnSidebar {...props}>
      <SidebarHeader className="flex flex-col gap-1 border-b p-2 border-border">
        <WorkspaceSwitcher />
        <div className="pb-2 pt-1">
          {currentWorkspace && <GlobalSearch workspaceId={currentWorkspace.id} />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      tooltip={item.name}
                      render={<Link href={item.href} />} 
                      isActive={pathname === item.href}
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel className="flex justify-between items-center group/label">
            Projects
            <PlusCircle className="size-4 cursor-pointer opacity-0 group-hover/label:opacity-100 transition-opacity hover:text-primary" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.slice(0, 5).map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton 
                    tooltip={project.name}
                    render={<Link href={`${baseUrl || '/app'}/projects/${project.id}`} />} 
                    isActive={pathname === `${baseUrl || '/app'}/projects/${project.id}`}
                  >
                    <span className={`size-2 rounded-full shrink-0 ${project.color}`} />
                    <span className="truncate">{project.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </ShadcnSidebar>
  )
}
