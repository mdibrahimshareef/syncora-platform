"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"

const STATUS_COLORS = {
  'Backlog': '#94a3b8',
  'Todo': '#cbd5e1',
  'In Progress': '#3b82f6',
  'Review': '#8b5cf6',
  'Done': '#10b981'
}

const PRIORITY_COLORS = {
  'Low': '#cbd5e1',
  'Medium': '#fbbf24',
  'High': '#f97316',
  'Urgent': '#ef4444'
}

const HEALTH_COLORS = {
  'On Track': '#10b981',
  'At Risk': '#f59e0b',
  'Off Track': '#ef4444',
  'Completed': '#3b82f6'
}

export default function ReportsPage() {
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const projects = useDataStore(s => s.projects);
  const fetchWorkspaceTasks = useDataStore(s => s.fetchWorkspaceTasks);
  const fetchProjects = useDataStore(s => s.fetchProjects);
  const isLoading = useDataStore(s => s.isLoading);
  const [projectFilter, setProjectFilter] = React.useState("all")

  React.useEffect(() => {
    fetchWorkspaceTasks()
    fetchProjects()
  }, [fetchWorkspaceTasks, fetchProjects])

  // Filter tasks based on project
  const filteredTasks = React.useMemo(() => {
    if (projectFilter === "all") return workspaceTasks
    return workspaceTasks.filter(t => t.projectId === projectFilter)
  }, [workspaceTasks, projectFilter])

  // Process Task Status Data
  const statusData = React.useMemo(() => {
    const counts = { 'Backlog': 0, 'Todo': 0, 'In Progress': 0, 'Review': 0, 'Done': 0 }
    filteredTasks.forEach(t => {
      if (counts[t.status as keyof typeof counts] !== undefined) {
        counts[t.status as keyof typeof counts]++
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredTasks])

  // Process Task Priority Data
  const priorityData = React.useMemo(() => {
    const counts = { 'Low': 0, 'Medium': 0, 'High': 0, 'Urgent': 0 }
    filteredTasks.forEach(t => {
      if (counts[t.priority as keyof typeof counts] !== undefined) {
        counts[t.priority as keyof typeof counts]++
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredTasks])

  // Process Project Health Data
  const healthData = React.useMemo(() => {
    const counts = { 'On Track': 0, 'At Risk': 0, 'Off Track': 0, 'Completed': 0 }
    projects.forEach(p => {
      // Basic heuristic for health if not explicitly set (which it isn't in Project type currently, but let's assume 'Active' implies On Track)
      const health = p.status === 'Completed' ? 'Completed' : 'On Track'
      counts[health as keyof typeof counts]++
    })
    return Object.entries(counts).filter(entry => entry[1] > 0).map(([name, value]) => ({ name, value }))
  }, [projects])

  if (isLoading && workspaceTasks.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Loading reports data...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">Visual insights into workspace health, task progress, and team performance.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Select value={projectFilter} onValueChange={(val) => setProjectFilter(val as string)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Task Status Distribution */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-2 shadow-sm border">
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
              <CardDescription>Current state of all tasks in {projectFilter === 'all' ? 'the workspace' : 'the selected project'}.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Health */}
          <Card className="col-span-1 shadow-sm border">
            <CardHeader>
              <CardTitle>Project Health</CardTitle>
              <CardDescription>Overall status of workspace projects.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              {healthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {healthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.name as keyof typeof HEALTH_COLORS] || '#cbd5e1'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No project data available.</div>
              )}
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm border">
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>Breakdown of tasks by urgency level.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} className="text-xs" />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
