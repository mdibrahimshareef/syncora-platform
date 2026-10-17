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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useDataStore } from "@/stores/data-store"
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher"

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
    }
  ]

  return (
    <ShadcnSidebar {...props}>
      <SidebarHeader className="border-b p-2 border-border">
        <WorkspaceSwitcher />
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
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="right-2 h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums leading-none bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 shadow-2xs transition-colors">
                        {item.badge > 99 ? '99+' : item.badge}
                      </SidebarMenuBadge>
                    )}
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
