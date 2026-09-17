import { ProjectsList } from "@/components/projects/ProjectsList"

export default function ProjectsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
        <p className="text-muted-foreground">
          Manage your workspace projects and initiatives.
        </p>
      </div>
      
      <ProjectsList />
    </div>
  )
}
