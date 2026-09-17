"use client"

import { useEffect, useMemo } from "react"
import { useDataStore } from "@/stores/data-store"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertCircle, Briefcase, ListTodo, Calendar, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export function DashboardClientWrapper() {
  const params = useParams()
  const fetchProjects = useDataStore(s => s.fetchProjects);
  const fetchActivity = useDataStore(s => s.fetchActivity);
  const fetchWorkspaceMembers = useDataStore(s => s.fetchWorkspaceMembers);
  const fetchWorkspaceTasks = useDataStore(s => s.fetchWorkspaceTasks);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const projects = useDataStore(s => s.projects);
  const currentUser = useDataStore(s => s.currentUser);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchProjects()
      fetchActivity()
      fetchWorkspaceMembers()
      fetchWorkspaceTasks()
    }
  }, [activeWorkspaceId, fetchProjects, fetchActivity, fetchWorkspaceMembers, fetchWorkspaceTasks])

  const baseUrl = `/${params.orgSlug || 'app'}/${params.teamSlug || ''}/${params.workspaceSlug || ''}`.replace(/\/+/g, '/').replace(/\/$/, '')

  // -- Derived Stats --
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const next7Days = today + (7 * 24 * 60 * 60 * 1000)
  const next30Days = today + (30 * 24 * 60 * 60 * 1000)
  const last7Days = today - (7 * 24 * 60 * 60 * 1000)

  // Workspace Health
  const activeProjectsCount = projects.filter(p => p.status === 'Active').length
  const openTasks = workspaceTasks.filter(t => t.status !== 'Done')
  const overdueTasks = openTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() < today)
  const completedThisWeek = workspaceTasks.filter(t => t.status === 'Done' && new Date(t.updatedAt).getTime() >= last7Days).length

  // My Work
  const myTasks = openTasks.filter(t => t.assignee?.id === currentUser?.id)
  const myDueToday = myTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() === today)
  const myOverdue = myTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() < today)
  const myRecentlyUpdated = workspaceTasks.filter(t => t.assignee?.id === currentUser?.id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3)

  // Upcoming
  const upcoming7 = openTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() >= today && new Date(t.dueDate).getTime() <= next7Days).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 5)
  const upcoming30Count = openTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() > next7Days && new Date(t.dueDate).getTime() <= next30Days).length

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace Health - 4 Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <Link href={`${baseUrl}/projects`} className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjectsCount}</div>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <Link href={`${baseUrl}/my-tasks`} className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTasks.length}</div>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-destructive/50 transition-colors group">
          <Link href={`${baseUrl}/reports`} className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-destructive transition-colors">Overdue Tasks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueTasks.length}</div>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <Link href={`${baseUrl}/reports`} className="block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed (7d)</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedThisWeek}</div>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* My Work Summary */}
        <Card className="col-span-1 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center justify-between">
              My Work
              <Link href={`${baseUrl}/my-tasks`} className="text-xs font-normal text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-muted/50 rounded-md p-2">
                <div className="text-lg font-bold">{myTasks.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned</div>
              </div>
              <div className="bg-muted/50 rounded-md p-2 border border-primary/20">
                <div className="text-lg font-bold text-primary">{myDueToday.length}</div>
                <div className="text-[10px] text-primary uppercase tracking-wider">Due Today</div>
              </div>
              <div className="bg-muted/50 rounded-md p-2 border border-destructive/20">
                <div className="text-lg font-bold text-destructive">{myOverdue.length}</div>
                <div className="text-[10px] text-destructive uppercase tracking-wider">Overdue</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recently Updated</h4>
              {myRecentlyUpdated.length > 0 ? (
                myRecentlyUpdated.map(task => (
                  <Link key={task.id} href={`${baseUrl}/projects/${task.projectId}?task=${task.id}`} className="flex items-start gap-3 rounded-lg border border-transparent p-2 hover:bg-muted/50 transition-colors -mx-2">
                    <div className="mt-0.5">
                      {task.status === 'Done' ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Clock className="size-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className="text-sm font-medium leading-none truncate">{task.title}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal truncate max-w-[80px]">{projects.find(p => p.id === task.projectId)?.name || 'Project'}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-normal border-border">{task.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">No recent tasks.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="col-span-1 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center justify-between">
              Upcoming Deadlines
              <Link href={`${baseUrl}/calendar`} className="text-xs font-normal text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                View Calendar
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next 7 Days</h4>
              {upcoming7.length > 0 ? (
                upcoming7.map(task => {
                  const isToday = new Date(task.dueDate!).getTime() === today
                  return (
                    <Link key={task.id} href={`${baseUrl}/projects/${task.projectId}?task=${task.id}`} className="flex items-center justify-between rounded-lg border border-transparent p-2 hover:bg-muted/50 transition-colors -mx-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`flex flex-col items-center justify-center size-9 rounded-md border ${isToday ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                          <span className="text-[10px] uppercase font-semibold leading-none">{new Date(task.dueDate!).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-sm font-bold leading-none mt-0.5">{new Date(task.dueDate!).getDate()}</span>
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-sm font-medium truncate">{task.title}</span>
                          <span className="text-xs text-muted-foreground truncate">{projects.find(p => p.id === task.projectId)?.name || 'Project'}</span>
                        </div>
                      </div>
                      {task.assignee?.id && (
                        <div className="size-6 rounded-full bg-secondary text-[10px] flex items-center justify-center font-medium shrink-0 ml-2">
                          {task.assignee.id.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  )
                })
              ) : (
                <div className="text-sm text-muted-foreground py-2 text-center border border-dashed rounded-md bg-muted/20">No tasks due in the next 7 days.</div>
              )}
              
              {upcoming30Count > 0 && (
                <div className="pt-2 mt-2 border-t">
                  <Link href={`${baseUrl}/calendar`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                    <Calendar className="size-3" />
                    +{upcoming30Count} more tasks due in the next 30 days
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </div>
  )
}
