"use client"

import { useEffect } from "react"
import { useDataStore } from "@/stores/data-store"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, Clock, AlertTriangle, ListTodo, Calendar, 
  ArrowRight, Inbox, Plus, Rocket, Zap, UserPlus, FolderPlus, Send
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

export function DashboardClientWrapper() {
  const params = useParams()
  const router = useRouter()
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)
  const currentUser = useDataStore(s => s.currentUser)

  // Fetch Actions
  const fetchProjects = useDataStore(s => s.fetchProjects)
  const fetchActivity = useDataStore(s => s.fetchActivity)
  const fetchWorkspaceMembers = useDataStore(s => s.fetchWorkspaceMembers)
  const fetchWorkspaceTasks = useDataStore(s => s.fetchWorkspaceTasks)
  const fetchIntegrations = useDataStore(s => s.fetchIntegrations)
  const fetchRequests = useDataStore(s => s.fetchRequests)

  // State
  const workspaceTasks = useDataStore(s => s.workspaceTasks)
  const projects = useDataStore(s => s.projects)
  const integrations = useDataStore(s => s.integrations)
  const requests = useDataStore(s => s.requests)
  const workspaceMembers = useDataStore(s => s.workspaceMembers)

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchProjects()
      fetchActivity()
      fetchWorkspaceMembers()
      fetchWorkspaceTasks()
      fetchIntegrations()
      fetchRequests()
    }
  }, [activeWorkspaceId, fetchProjects, fetchActivity, fetchWorkspaceMembers, fetchWorkspaceTasks, fetchIntegrations, fetchRequests])

  const baseUrl = `/${params.orgSlug || 'app'}/${params.teamSlug || ''}/${params.workspaceSlug || ''}`.replace(/\/+/g, '/').replace(/\/$/, '')
  const firstName = currentUser?.name?.split(' ')[0] || 'there'

  // -- Derived Stats --
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const next7Days = today + (7 * 24 * 60 * 60 * 1000)

  // Tasks
  const completedTasks = workspaceTasks.filter(t => t.status === 'Done')
  const openTasks = workspaceTasks.filter(t => t.status !== 'Done')
  const overdueTasks = openTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() < today)
  
  const myTasks = openTasks.filter(t => t.assignee?.id === currentUser?.id)
  const myDueToday = myTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() === today)
  const myOverdue = myTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() < today)
  const upcoming7 = openTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() >= today && new Date(t.dueDate).getTime() <= next7Days).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 5)

  // Projects
  const activeProjects = projects.filter(p => p.status === 'Active')

  // Requests
  const pendingRequests = requests?.filter(r => r.status === 'Pending') || []

  // Integrations Health
  const connectedIntegrations = integrations?.filter(i => i.status === 'connected') || []
  const failingIntegrations = integrations?.filter(i => i.status === 'error') || []

  // -- Empty State Detection --
  if (projects.length === 0 && openTasks.length === 0) {
    return (
      <div className="flex flex-col gap-10 py-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">Good morning, {firstName}</h1>
          <p className="text-xl text-muted-foreground">Let's get your workspace moving.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button size="lg" onClick={() => router.push(`${baseUrl}/projects`)} className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent shadow-none">
            <FolderPlus className="size-5 mr-2" />
            Create Project
          </Button>
          <Button size="lg" onClick={() => router.push(`${baseUrl}/my-tasks`)} className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent shadow-none">
            <Plus className="size-5 mr-2" />
            Create Task
          </Button>
          <Button size="lg" onClick={() => router.push(`${baseUrl}/requests`)} className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent shadow-none">
            <Send className="size-5 mr-2" />
            Create Request
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Getting Started</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-lg">
                <div className={`size-6 rounded-full flex items-center justify-center border-2 ${projects.length > 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                  {projects.length > 0 && <CheckCircle2 className="size-4" />}
                </div>
                <span className={projects.length > 0 ? 'line-through text-muted-foreground' : ''}>Create your first project</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <div className={`size-6 rounded-full flex items-center justify-center border-2 ${workspaceTasks.length > 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                  {workspaceTasks.length > 0 && <CheckCircle2 className="size-4" />}
                </div>
                <span className={workspaceTasks.length > 0 ? 'line-through text-muted-foreground' : ''}>Create your first task</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <div className={`size-6 rounded-full flex items-center justify-center border-2 ${workspaceMembers.length > 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                  {workspaceMembers.length > 1 && <CheckCircle2 className="size-4" />}
                </div>
                <span className={workspaceMembers.length > 1 ? 'line-through text-muted-foreground' : ''}>Invite your team</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <div className={`size-6 rounded-full flex items-center justify-center border-2 ${integrations.length > 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                  {integrations.length > 0 && <CheckCircle2 className="size-4" />}
                </div>
                <span className={integrations.length > 0 ? 'line-through text-muted-foreground' : ''}>Connect an integration</span>
              </div>
            </div>
          </div>
          <div className="bg-muted/30 rounded-xl p-8 border border-dashed border-border flex flex-col justify-center text-center">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Your Workspace</h3>
            <p className="text-lg font-medium mb-2">You don't have activity yet.</p>
            <p className="text-muted-foreground">Once your team starts working, you'll see tasks, deadlines, activity and project health here.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10 pb-8 pt-4">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Good morning, {firstName}</h1>
        <p className="text-xl text-muted-foreground">Here's what needs your attention today.</p>
      </div>

      {/* QUICK ACTIONS */}
      <div className="flex gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push(`${baseUrl}/my-tasks`)}>
          <Plus className="size-4 mr-2" />
          Create Task
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`${baseUrl}/projects`)}>
          <FolderPlus className="size-4 mr-2" />
          Create Project
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`${baseUrl}/requests`)}>
          <Send className="size-4 mr-2" />
          Create Request
        </Button>
      </div>

      {/* ATTENTION REQUIRED SECTION */}
      {(myOverdue.length > 0 || pendingRequests.length > 0 || failingIntegrations.length > 0 || myDueToday.length > 0) && (
        <section>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Needs Your Attention</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {myOverdue.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors" onClick={() => router.push(`${baseUrl}/my-tasks`)}>
                <div className="flex items-center gap-3 text-destructive font-medium">
                  <div className="size-2 rounded-full bg-destructive" />
                  {myOverdue.length} Overdue tasks
                </div>
                <Badge variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive/20 border-none shadow-none">Overdue</Badge>
              </div>
            )}
            
            {pendingRequests.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors" onClick={() => router.push(`${baseUrl}/requests`)}>
                <div className="flex items-center gap-3 text-amber-700 font-medium">
                  <div className="size-2 rounded-full bg-amber-500" />
                  {pendingRequests.length} Incoming requests
                </div>
                <Badge className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20 border-none shadow-none">Waiting</Badge>
              </div>
            )}

            {myDueToday.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors" onClick={() => router.push(`${baseUrl}/my-tasks?filter=today`)}>
                <div className="flex items-center gap-3 text-primary font-medium">
                  <div className="size-2 rounded-full bg-primary" />
                  {myDueToday.length} Tasks due today
                </div>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none shadow-none">Due today</Badge>
              </div>
            )}

            {failingIntegrations.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors" onClick={() => router.push(`${baseUrl}/settings/integrations`)}>
                <div className="flex items-center gap-3 text-destructive font-medium">
                  <div className="size-2 rounded-full bg-destructive" />
                  {failingIntegrations.length} Integrations failing
                </div>
                <Badge variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive/20 border-none shadow-none">Error</Badge>
              </div>
            )}
          </div>
        </section>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border bg-card flex flex-col">
          <span className="text-3xl font-bold mb-1">{activeProjects.length}</span>
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Projects</span>
        </div>
        <div className="p-6 rounded-xl border bg-card flex flex-col">
          <span className="text-3xl font-bold mb-1">{openTasks.length}</span>
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Open Tasks</span>
        </div>
        <div className="p-6 rounded-xl border bg-card flex flex-col">
          <span className="text-3xl font-bold mb-1 text-destructive">{overdueTasks.length}</span>
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Overdue</span>
        </div>
        <div className="p-6 rounded-xl border bg-card flex flex-col">
          <span className="text-3xl font-bold mb-1">{completedTasks.length}</span>
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Completed</span>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* MY WORK & UPCOMING */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">My Work</h3>
                <Link href={`${baseUrl}/my-tasks`} className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <p className="text-xs text-muted-foreground mb-4 font-medium">My assigned tasks</p>
              <div className="space-y-1">
                {myTasks.length > 0 ? myTasks.slice(0, 5).map(task => (
                  <Link key={task.id} href={`${baseUrl}/projects/${task.projectId}?task=${task.id}`} className="block p-2 -mx-2 rounded hover:bg-muted/50 truncate text-sm font-medium">
                    {task.title}
                  </Link>
                )) : (
                  <p className="text-sm text-muted-foreground py-2">No assigned tasks.</p>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Upcoming</h3>
                <Link href={`${baseUrl}/calendar`} className="text-xs text-primary hover:underline">Calendar</Link>
              </div>
              <p className="text-xs text-muted-foreground mb-4 font-medium">Next deadlines</p>
              <div className="space-y-1">
                {upcoming7.length > 0 ? upcoming7.map(task => {
                  const isToday = new Date(task.dueDate!).getTime() === today
                  const isTomorrow = new Date(task.dueDate!).getTime() === today + 86400000
                  const dateStr = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : new Date(task.dueDate!).toLocaleDateString('en-US', { weekday: 'long' })
                  
                  return (
                    <div key={task.id} className="flex items-center justify-between p-2 -mx-2 rounded hover:bg-muted/50 group">
                      <Link href={`${baseUrl}/projects/${task.projectId}?task=${task.id}`} className="truncate text-sm font-medium">
                        {task.title}
                      </Link>
                      <span className={`text-xs whitespace-nowrap ml-4 ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{dateStr}</span>
                    </div>
                  )
                }) : (
                  <p className="text-sm text-muted-foreground py-2">No upcoming deadlines.</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6">
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
            </div>
            <RecentActivity />
          </div>
        </div>

        {/* PROJECT HEALTH & INTEGRATIONS */}
        <div className="space-y-10">
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Project Health</h3>
              <Link href={`${baseUrl}/projects`} className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="space-y-4">
              {activeProjects.slice(0, 5).map(project => {
                const projTasks = workspaceTasks.filter(t => t.projectId === project.id);
                const completedCount = projTasks.filter(t => t.status === 'Done').length;
                const progress = projTasks.length > 0 ? Math.round((completedCount / projTasks.length) * 100) : 0;
                
                // Simple derived health logic based on progress and overdue tasks
                const projOverdue = projTasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate).getTime() < today).length;
                let healthStatus = "On Track";
                let healthColor = "text-emerald-600";
                
                if (projOverdue > 2) {
                  healthStatus = "At Risk";
                  healthColor = "text-destructive";
                } else if (projOverdue > 0 || (progress < 20 && projTasks.length > 5)) {
                  healthStatus = "Needs Attention";
                  healthColor = "text-amber-600";
                }

                return (
                  <div key={project.id} className="flex items-center justify-between group cursor-pointer" onClick={() => router.push(`${baseUrl}/projects/${project.id}`)}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || 'var(--primary)' }} />
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-xs font-bold w-8 text-right">{progress}%</span>
                      <span className={`text-xs w-24 text-right ${healthColor}`}>{healthStatus}</span>
                    </div>
                  </div>
                )
              })}
              
              {activeProjects.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No active projects tracking.</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Integrations</h3>
              <Link href={`${baseUrl}/settings/integrations`} className="text-xs text-primary hover:underline">Manage</Link>
            </div>
            <div className="space-y-3">
              {connectedIntegrations.map(int => (
                <div key={int.id} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="font-medium capitalize">{int.name} connected</span>
                </div>
              ))}
              {failingIntegrations.map(int => (
                <div key={int.id} className="flex items-center gap-3 text-sm">
                  <AlertTriangle className="size-4 text-destructive" />
                  <span className="font-medium text-destructive capitalize">{int.name} needs attention</span>
                </div>
              ))}
              {connectedIntegrations.length === 0 && failingIntegrations.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No integrations connected.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
