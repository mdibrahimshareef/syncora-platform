"use client"

import * as React from "react"
import { useEffect } from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckSquare, Calendar, AlertTriangle, CheckCircle, FileText, Send } from "lucide-react"

export function MyWorkClientWrapper() {
  const currentUser = useDataStore(s => s.currentUser);
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const approvals = useDataStore(s => s.approvals);
  const requests = useDataStore(s => s.requests);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const fetchWorkspaceTasks = useDataStore(s => s.fetchWorkspaceTasks);
  const fetchApprovals = useDataStore(s => s.fetchApprovals);
  const fetchRequests = useDataStore(s => s.fetchRequests);
  const activity = useDataStore(s => s.activity);
  const fetchActivity = useDataStore(s => s.fetchActivity);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkspaceTasks()
      fetchApprovals()
      fetchRequests()
      fetchActivity()
    }
  }, [activeWorkspaceId, fetchWorkspaceTasks, fetchApprovals, fetchRequests, fetchActivity])

  if (!currentUser) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-6xl mx-auto w-full flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p>Loading your workspace...</p>
        </div>
      </div>
    )
  }

  // 1. Filter Tasks
  const assignedTasks = workspaceTasks.filter(t => t.assignee?.id === currentUser.id && t.status !== 'Done')
  
  const todayStr = new Date().toISOString().split('T')[0]
  const overdueTasks = assignedTasks.filter(t => t.dueDate && t.dueDate < todayStr)
  const todayTasks = assignedTasks.filter(t => t.dueDate === todayStr)
  const upcomingTasks = assignedTasks.filter(t => !t.dueDate || t.dueDate > todayStr)

  // 2. Filter Approvals
  const pendingApprovals = approvals.filter(a => a.approver_id === currentUser.id && a.status === 'Pending')

  // 3. Filter Requests
  const myRequests = requests.filter(r => r.requester_id === currentUser.id && r.status !== 'Completed' && r.status !== 'Rejected')

  // Group tasks by Priority and Status for unified view
  const tasksByPriority = {
    'Urgent': assignedTasks.filter(t => t.priority === 'Urgent'),
    'High': assignedTasks.filter(t => t.priority === 'High'),
    'Medium': assignedTasks.filter(t => t.priority === 'Medium'),
    'Low': assignedTasks.filter(t => t.priority === 'Low'),
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Work</h2>
          <p className="text-muted-foreground">
            Your personal command center for tasks, approvals, and requests.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="list">Unified Task List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* WORKLOAD CAPACITY */}
          <Card className="bg-muted/30">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8 justify-between items-center">
                <div className="flex-1 w-full">
                  <h3 className="text-lg font-medium mb-2">Weekly Capacity</h3>
                  <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                    <span>{assignedTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0)} hrs assigned</span>
                    <span>40 hrs total</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${assignedTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0) > 40 ? 'bg-destructive' : 'bg-primary'}`} 
                      style={{ width: `${Math.min(100, (assignedTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0) / 40) * 100)}%` }}
                    ></div>
                  </div>
                  {assignedTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0) > 40 && (
                    <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> You are over capacity!
                    </p>
                  )}
                </div>
                
                <div className="flex gap-8 px-4 md:border-l border-border md:pl-8">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold">{assignedTasks.length}</span>
                    <span className="text-sm text-muted-foreground">Active Tasks</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold">{assignedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)}</span>
                    <span className="text-sm text-muted-foreground">Story Points</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            {/* OVERDUE */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Overdue
                  <Badge variant="destructive" className="ml-auto">{overdueTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-2">
                  {overdueTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No overdue tasks.</p>
                  ) : (
                    overdueTasks.map(task => (
                      <div key={task.id} className="text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-destructive mt-1">Due: {new Date(task.dueDate!).toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* TODAY */}
            <Card className="border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Due Today
                  <Badge variant="default" className="ml-auto">{todayTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-2">
                  {todayTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You're all caught up for today!</p>
                  ) : (
                    todayTasks.map(task => (
                      <div key={task.id} className="text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">Status: {task.status}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* UPCOMING */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Upcoming / No Date
                  <Badge variant="secondary" className="ml-auto">{upcomingTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-2">
                  {upcomingTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
                  ) : (
                    upcomingTasks.slice(0, 10).map(task => (
                      <div key={task.id} className="text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}
                        </div>
                      </div>
                    ))
                  )}
                  {upcomingTasks.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center">
                      + {upcomingTasks.length - 10} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-8">
            {/* APPROVALS */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-orange-500" />
                  Pending Approvals
                  {pendingApprovals.length > 0 && <Badge variant="secondary" className="ml-auto">{pendingApprovals.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-2">
                  {pendingApprovals.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No approvals require your sign-off.</p>
                  ) : (
                    pendingApprovals.map(approval => (
                      <div key={approval.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                        <div className="font-medium capitalize">{approval.resource_type} Approval</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          Requested by {approval.requester?.name || 'Someone'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* REQUESTS */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" />
                  My Active Requests
                  {myRequests.length > 0 && <Badge variant="secondary" className="ml-auto">{myRequests.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-2">
                  {myRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">You have no active requests.</p>
                  ) : (
                    myRequests.map(request => (
                      <div key={request.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0 flex justify-between items-start">
                        <div>
                          <div className="font-medium">{request.form?.title || 'Request'}</div>
                          <div className="text-xs text-muted-foreground mt-1">Submitted on {new Date(request.createdAt).toLocaleDateString()}</div>
                        </div>
                        <Badge variant="outline">{request.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RECENT ACTIVITY */}
          <Card className="mt-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent activity.</p>
                ) : (
                  activity.slice(0, 5).map(act => (
                    <div key={act.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="font-medium">{act.action}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {act.target} • {new Date(act.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="list" className="space-y-6 pt-4">
          {Object.entries(tasksByPriority).map(([priority, tasksList]) => {
            if (tasksList.length === 0) return null
            
            // Group further by status inside each priority bucket
            const tasksByStatus = tasksList.reduce((acc, task) => {
              const status = task.status || 'Unknown'
              if (!acc[status]) acc[status] = []
              acc[status].push(task)
              return acc
            }, {} as Record<string, typeof tasksList>)
            
            return (
              <div key={priority} className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Badge variant={priority === 'Urgent' ? 'destructive' : priority === 'High' ? 'default' : 'secondary'}>
                    {priority} Priority ({tasksList.length})
                  </Badge>
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                    <Card key={`${priority}-${status}`}>
                      <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                        <CardTitle className="text-sm flex justify-between">
                          <span>{status}</span>
                          <span className="text-muted-foreground">{statusTasks.length}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border">
                          {statusTasks.map(task => (
                            <div key={task.id} className="p-3 text-sm hover:bg-muted/50 transition-colors">
                              <div className="font-medium">{task.title}</div>
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                                {task.estimatedHours ? <span>{task.estimatedHours} hrs</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
          {assignedTasks.length === 0 && (
            <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground">
              You have no active tasks assigned to you.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
