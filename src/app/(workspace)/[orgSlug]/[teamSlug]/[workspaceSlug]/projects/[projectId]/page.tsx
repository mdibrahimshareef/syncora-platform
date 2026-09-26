"use client"

import * as React from "react"
import { TaskBoard } from "@/components/tasks/TaskBoard"
import { TaskListView } from "@/components/tasks/TaskListView"
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView"
import { TaskTimelineView } from "@/components/tasks/TaskTimelineView"
import { ProjectOverview } from "@/components/tasks/ProjectOverview"
import { notFound, useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, MoreHorizontal, Trash2, Edit } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"
import { useDataStore, useIsAdminOrOwner } from "@/stores/data-store"
import { TaskFilters, TaskFilterState } from "@/components/tasks/TaskFilters"
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog"
import { PresenceAvatars } from "@/components/collaboration/PresenceAvatars"
import { ProjectSettings } from "@/components/tasks/ProjectSettings"
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog"

import { getProjectStatuses } from "@/lib/api/projects"
import { createClient } from "@/lib/supabase/client"

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params)
  const supabase = createClient()
  const baseUrl = useWorkspaceUrl()
  const isAdminOrOwner = useIsAdminOrOwner()
  
  const projects = useDataStore(s => s.projects);
  const projectStatuses = useDataStore(s => s.projectStatuses);
  const tasks = useDataStore(s => s.tasks);
  const milestones = useDataStore(s => s.milestones);
  const templates = useDataStore(s => s.templates);
  const fetchTasks = useDataStore(s => s.fetchTasks);
  const fetchMilestones = useDataStore(s => s.fetchMilestones);
  const fetchProjectStatuses = useDataStore(s => s.fetchProjectStatuses);
  const fetchProjects = useDataStore(s => s.fetchProjects);
  const fetchTemplates = useDataStore(s => s.fetchTemplates);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const isLoading = useDataStore(s => s.isLoading);
  const deleteProject = useDataStore(s => s.deleteProject);
  const [isStatusesLoading, setIsStatusesLoading] = React.useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState("")
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    if (activeWorkspaceId && projects.length === 0) {
      fetchProjects()
    }
    if (projectId) {
      fetchTasks(projectId)
      fetchProjectStatuses(projectId)
      fetchMilestones(projectId)
      if (templates.length === 0) {
        fetchTemplates()
      }
    }
  }, [projectId, activeWorkspaceId, projects.length, fetchProjects, fetchTasks, fetchMilestones, fetchProjectStatuses])

  const project = projects.find(p => p.id === projectId)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [filters, setFiltersState] = React.useState<TaskFilterState>({
    search: searchParams.get('search') || "",
    priorities: searchParams.get('priorities') ? searchParams.get('priorities')!.split(',') : [],
    statuses: searchParams.get('statuses') ? searchParams.get('statuses')!.split(',') : [],
    assignees: searchParams.get('assignees') ? searchParams.get('assignees')!.split(',') : []
  })

  // Custom setter that also updates the URL
  const setFilters = React.useCallback((value: TaskFilterState | ((prev: TaskFilterState) => TaskFilterState)) => {
    setFiltersState(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      
      const params = new URLSearchParams(searchParams.toString())
      if (next.search) params.set('search', next.search)
      else params.delete('search')
      
      if (next.priorities.length > 0) params.set('priorities', next.priorities.join(','))
      else params.delete('priorities')
      
      if (next.statuses?.length > 0) params.set('statuses', next.statuses.join(','))
      else params.delete('statuses')
      
      if (next.assignees.length > 0) params.set('assignees', next.assignees.join(','))
      else params.delete('assignees')

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      
      return next
    })
  }, [searchParams, pathname, router])

  const [isCreateTaskOpen, setIsCreateTaskOpen] = React.useState(false)

  // Filter tasks based on local state
  const projectTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (t.projectId !== projectId) return false
      
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) && 
          !(t.description || "").toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) {
        return false
      }
      
      if (filters.assignees.length > 0) {
        if (!t.assignee) return false
        if (!filters.assignees.includes(t.assignee.id)) return false
      }
      
      return true
    })
  }, [tasks, projectId, filters])

  if ((isLoading || isStatusesLoading) && !project) {
    return <div className="flex items-center justify-center h-full"><span className="text-muted-foreground animate-pulse">Loading project...</span></div>
  }

  if (!project) {
    notFound()
  }

  return (
    <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-6 md:px-8 py-5 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`size-8 rounded-md flex items-center justify-center ${project.color}`}>
            <span className="text-white font-semibold text-sm">{project.name.substring(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
              {project.templateId && templates.find(t => t.id === project.templateId) && (
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  {templates.find(t => t.id === project.templateId)?.name} Template
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span>{projectTasks.length} tasks</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <PresenceAvatars projectId={project.id} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TabsList className="hidden sm:flex h-9 mr-2">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="board" className="text-xs">Board</TabsTrigger>
            <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>

          <TaskFilters filters={filters} setFilters={setFilters} />
          
          <Button size="sm" onClick={() => setIsCreateTaskOpen(true)}>
            <Plus className="mr-2 size-3.5" /> New Task
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-9 ml-1" />}>
              <MoreHorizontal className="size-4 text-muted-foreground" />
              <span className="sr-only">More options</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isAdminOrOwner ? (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    <Edit className="mr-2 size-4" />
                    <span>Edit Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground text-sm">No actions available</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdminOrOwner && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) setDeleteConfirmationText("")
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the 
                  <span className="font-semibold text-foreground mx-1">{project.name}</span> 
                  project, including all tasks, milestones, and settings associated with it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="py-4">
                <Label htmlFor="confirm-delete" className="text-sm font-medium">
                  Please type <span className="font-bold select-all">{project.name}</span> to confirm.
                </Label>
                <Input 
                  id="confirm-delete"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="mt-2"
                  placeholder={project.name}
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <Button 
                  variant="destructive" 
                  disabled={deleteConfirmationText !== project.name || isDeleting}
                  onClick={async () => {
                    setIsDeleting(true)
                    try {
                      await deleteProject(project.id)
                      toast.success("Project deleted successfully")
                      router.push(`${baseUrl}/projects`)
                    } catch (error: any) {
                      console.error("Delete error:", error)
                      toast.error(`Failed to delete project: ${error?.message || error?.details || JSON.stringify(error)}`)
                      setIsDeleting(false)
                    }
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete Project"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden px-6 md:px-8 pb-6 flex flex-col">
        <div className="sm:hidden mb-4 mt-4 shrink-0">
          <TabsList className="w-full h-9 flex overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="board" className="text-xs shrink-0">Board</TabsTrigger>
            <TabsTrigger value="list" className="text-xs shrink-0">List</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs shrink-0">Calendar</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs shrink-0">Timeline</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs shrink-0">Settings</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="flex-1 mt-0 h-full data-[state=inactive]:hidden outline-none pb-4 pt-6 sm:pt-4">
          <ProjectOverview project={project} tasks={projectTasks} />
        </TabsContent>
        <TabsContent value="board" className="flex-1 mt-0 h-full data-[state=inactive]:hidden outline-none pb-4 pt-6 sm:pt-4">
          <TaskBoard tasks={projectTasks} projectStatuses={projectStatuses} />
        </TabsContent>
        <TabsContent value="list" className="flex-1 mt-0 h-full data-[state=inactive]:hidden outline-none pb-4 pt-6 sm:pt-4">
          <TaskListView tasks={projectTasks} projectStatuses={projectStatuses} />
        </TabsContent>
        <TabsContent value="calendar" className="flex-1 mt-0 h-full data-[state=inactive]:hidden outline-none pb-4 pt-6 sm:pt-4">
          <TaskCalendarView tasks={projectTasks} />
        </TabsContent>
        <TabsContent value="timeline" className="flex-1 mt-0 h-full data-[state=inactive]:hidden outline-none pb-4 pt-6 sm:pt-4">
          <TaskTimelineView tasks={projectTasks} />
        </TabsContent>
        <TabsContent value="settings" className="flex-1 mt-0 h-full data-[state=inactive]:hidden outline-none pb-4 pt-6 sm:pt-4">
          <ProjectSettings project={project} projectStatuses={projectStatuses} />
        </TabsContent>
      </div>

      <CreateTaskDialog 
        open={isCreateTaskOpen} 
        onOpenChange={setIsCreateTaskOpen} 
        defaultValues={{ projectId: project.id }}
      />
      <CreateProjectDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        defaultValues={project}
      />
    </Tabs>
  )
}
