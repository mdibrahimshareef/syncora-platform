"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

export default function WorkloadPage() {
  const workspaceMembers = useDataStore(s => s.workspaceMembers);
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const fetchWorkspaceTasks = useDataStore(s => s.fetchWorkspaceTasks);
  const fetchWorkspaceMembers = useDataStore(s => s.fetchWorkspaceMembers);
  const isLoading = useDataStore(s => s.isLoading);
  const [searchQuery, setSearchQuery] = React.useState("")
  const [projectFilter, setProjectFilter] = React.useState("all")

  React.useEffect(() => {
    fetchWorkspaceMembers()
    fetchWorkspaceTasks()
  }, [fetchWorkspaceMembers, fetchWorkspaceTasks])

  // Filter tasks based on project
  const filteredTasks = React.useMemo(() => {
    if (projectFilter === "all") return workspaceTasks
    return workspaceTasks.filter(t => t.projectId === projectFilter)
  }, [workspaceTasks, projectFilter])

  const globalProjects = useDataStore(s => s.projects)

  // Group tasks by assignee
  const workloadStats = React.useMemo(() => {
    const stats: Record<string, { member: any, todo: number, inProgress: number, done: number, overdue: number, blocked: number, total: number, totalEffort: number, activeProjects: Set<string> }> = {}
    
    // Initialize for all members
    workspaceMembers.forEach(m => {
      stats[m.id] = { member: m, todo: 0, inProgress: 0, done: 0, overdue: 0, blocked: 0, total: 0, totalEffort: 0, activeProjects: new Set() }
    })
    
    // Include unassigned
    stats['unassigned'] = { member: { id: 'unassigned', name: 'Unassigned', initials: '?' }, todo: 0, inProgress: 0, done: 0, overdue: 0, blocked: 0, total: 0, totalEffort: 0, activeProjects: new Set() }

    const today = new Date()
    today.setHours(0,0,0,0)

    filteredTasks.forEach(task => {
      const assigneeId = task.assignee?.id || 'unassigned'
      if (!stats[assigneeId]) {
         stats[assigneeId] = { member: { id: assigneeId, name: 'Unknown', initials: '?' }, todo: 0, inProgress: 0, done: 0, overdue: 0, blocked: 0, total: 0, totalEffort: 0, activeProjects: new Set() }
      }
      
      stats[assigneeId].total++
      if (task.projectId) {
        stats[assigneeId].activeProjects.add(task.projectId)
      }
      
      if (task.status === 'Done' || task.status === 'Completed') {
        stats[assigneeId].done++
      } else if (task.status === 'Blocked') {
        stats[assigneeId].blocked++
      } else {
        if (task.status === 'In Progress' || task.status === 'Review' || task.status === 'In Review') {
          stats[assigneeId].inProgress++
        } else {
          stats[assigneeId].todo++
        }
        
        if (task.dueDate && new Date(task.dueDate).getTime() < today.getTime()) {
          stats[assigneeId].overdue++
        }
        
        if (task.estimatedTime) {
          stats[assigneeId].totalEffort += task.estimatedTime
        }
      }
    })

    return Object.values(stats)
  }, [filteredTasks, workspaceMembers])

  const filteredStats = workloadStats.filter(stat => 
    stat.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (stat.total > 0 && stat.member.id === 'unassigned' && "unassigned".includes(searchQuery.toLowerCase()))
  )

  if (isLoading && workspaceMembers.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Loading workload data...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Team Workload</h1>
          <p className="text-muted-foreground">Monitor team capacity, task distribution, and identify bottlenecks across all projects.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <Select value={projectFilter} onValueChange={(val) => setProjectFilter(val as string)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {globalProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Team Member</TableHead>
                <TableHead className="text-center">To Do</TableHead>
                <TableHead className="text-center">In Progress</TableHead>
                <TableHead className="text-center">Done</TableHead>
                <TableHead className="text-center">Blocked</TableHead>
                <TableHead className="text-center">Overdue</TableHead>
                <TableHead className="text-center">Active Projects</TableHead>
                <TableHead className="text-center">Effort (Hrs)</TableHead>
                <TableHead className="text-center">Capacity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((stat) => (
                <TableRow key={stat.member.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={stat.member.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{stat.member.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{stat.member.name}</div>
                        {stat.member.id !== 'unassigned' && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{stat.member.email || stat.member.role}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 rounded-full text-xs font-medium ${stat.todo > 0 ? 'bg-slate-100 dark:bg-slate-800' : 'text-muted-foreground'}`}>
                      {stat.todo}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 rounded-full text-xs font-medium ${stat.inProgress > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-muted-foreground'}`}>
                      {stat.inProgress}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 rounded-full text-xs font-medium ${stat.done > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {stat.done}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 rounded-full text-xs font-bold ${stat.blocked > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'text-muted-foreground'}`}>
                      {stat.blocked}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 rounded-full text-xs font-bold ${stat.overdue > 0 ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'}`}>
                      {stat.overdue}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {stat.activeProjects.size}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {stat.totalEffort > 0 ? (stat.totalEffort / 60).toFixed(1) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {/* Capacity Indicator: Uses hours if available, otherwise task count */}
                    <div className="flex items-center justify-center">
                      {(stat.totalEffort > 0 ? (stat.totalEffort / 60 > 40) : (stat.todo + stat.inProgress > 10)) ? (
                        <span className="text-xs text-destructive border border-destructive/20 bg-destructive/10 px-2 py-0.5 rounded-full font-medium">Overloaded</span>
                      ) : (stat.todo + stat.inProgress) === 0 ? (
                        <span className="text-xs text-muted-foreground border px-2 py-0.5 rounded-full">Available</span>
                      ) : (
                        <span className="text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-medium">Optimal</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No matching members or tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
