"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Loader2 } from "lucide-react"
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog"

export function ProjectsList() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const projects = useDataStore(s => s.projects);
  const fetchProjects = useDataStore(s => s.fetchProjects);
  const isLoading = useDataStore(s => s.isLoading);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);

  React.useEffect(() => {
    if (activeWorkspaceId) {
      fetchProjects()
    }
  }, [activeWorkspaceId, fetchProjects])

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (isLoading && projects.length === 0) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search projects..." 
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          New Project
        </Button>
        <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-lg bg-muted/30">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No projects found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            We couldn't find any projects matching "{searchQuery}". Try adjusting your search term.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        </div>
      )}
    </div>
  )
}
