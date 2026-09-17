"use client"

import * as React from "react"
import Link from "next/link"
import { Project } from "@/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const baseUrl = useWorkspaceUrl()
  
  return (
    <Link href={`${baseUrl}/projects/${project.id}`} className="block group">
      <Card className="h-full border-border transition-colors hover:border-primary/50 hover:shadow-sm">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className={`size-3 rounded-full ${project.color}`} />
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
              {project.name}
            </h3>
          </div>
          <Badge variant={project.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5 font-normal">
            {project.status}
          </Badge>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {project.description}
          </p>
          
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full ${project.color}`} 
                style={{ width: `${project.progress}%` }} 
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-border/50 mt-4">
          <div className="flex -space-x-2">
            {project.members.slice(0, 3).map(member => (
              <Avatar key={member.id} className="size-6 border-2 border-background">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{member.initials}</AvatarFallback>
              </Avatar>
            ))}
            {project.members.length > 3 && (
              <div className="size-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                +{project.members.length - 3}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {project.taskCount} tasks
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
