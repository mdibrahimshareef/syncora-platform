"use client"

import * as React from "react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useDataStore } from "@/stores/data-store"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Building2, Users, FolderKanban, Plus, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function OrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const { organizations, teams } = useOrganizationStore()
  const workspaces = useDataStore(s => s.workspaces);
  
  const orgSlug = params.orgSlug as string
  
  const currentOrg = organizations.find(o => o.slug === orgSlug)
  const orgTeams = teams.filter(t => t.orgId === currentOrg?.id)

  // React.useEffect(() => {
  //   if (currentOrg && currentOrg.id !== useOrganizationStore.getState().activeOrganizationId) {
  //     useOrganizationStore.getState().setActiveOrganizationId(currentOrg.id)
  //   }
  // }, [currentOrg])

  if (!currentOrg) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Building2 className="size-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold tracking-tight">Organization Not Found</h2>
        <p className="text-muted-foreground mt-2">
          We couldn't find an organization with the slug "{orgSlug}".
        </p>
        <Button className="mt-6" onClick={() => router.push("/")}>Return Home</Button>
      </div>
    )
  }

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase()

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 rounded-lg border-2 border-border/50">
            <AvatarImage src={currentOrg.logoUrl} alt={currentOrg.name} />
            <AvatarFallback className="rounded-lg text-xl font-bold">{getInitials(currentOrg.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">{currentOrg.name}</h2>
            <p className="text-muted-foreground">
              Organization Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/${orgSlug}/settings`)}>
            Manage Organization
          </Button>
          <Button>
            <Plus className="mr-2 size-4" />
            New Team
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgTeams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workspaces.filter(w => w.organizationId === currentOrg.id).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Teams in {currentOrg.name}</h3>
        </div>
        
        {orgTeams.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center bg-muted/20">
            <h4 className="text-lg font-medium mb-2">No teams yet</h4>
            <p className="text-muted-foreground text-sm mb-4">
              Create a team to start organizing your workspaces and projects.
            </p>
            <Button variant="outline">Create your first Team</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgTeams.map((team) => {
              const teamWorkspaces = workspaces.filter(w => w.teamId === team.id)
              return (
                <Link key={team.id} href={`/${orgSlug}/${team.slug}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{team.name}</span>
                        <ChevronRight className="size-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </CardTitle>
                      {team.description && (
                        <CardDescription className="line-clamp-2">
                          {team.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="mt-auto pt-4 text-sm text-muted-foreground border-t">
                      {teamWorkspaces.length} workspace{teamWorkspaces.length !== 1 ? 's' : ''}
                    </CardFooter>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
