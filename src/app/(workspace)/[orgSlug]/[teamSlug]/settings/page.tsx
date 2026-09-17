"use client"

import * as React from "react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useParams, useRouter } from "next/navigation"
import { Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { updateTeam } from "@/lib/api/teams"
import { createClient } from "@/lib/supabase/client"
import { TeamMembers } from "@/components/settings/TeamMembers"

export default function TeamSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { organizations, teams } = useOrganizationStore()
  const supabase = createClient()
  
  const orgSlug = params.orgSlug as string
  const teamSlug = params.teamSlug as string
  
  const currentOrg = organizations.find(o => o.slug === orgSlug)
  const currentTeam = teams.find(t => t.slug === teamSlug && t.orgId === currentOrg?.id)

  const [name, setName] = React.useState(currentTeam?.name || "")
  const [slug, setSlug] = React.useState(currentTeam?.slug || "")
  const [description, setDescription] = React.useState(currentTeam?.description || "")
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (currentTeam) {
      setName(currentTeam.name)
      setSlug(currentTeam.slug)
      setDescription(currentTeam.description || "")
    }
  }, [currentTeam])

  if (!currentOrg || !currentTeam) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateTeam(supabase, currentTeam.id, { name, slug, description })
      useOrganizationStore.getState().updateTeam(currentTeam.id, { name, slug, description })
      toast.success("Team updated successfully")
      if (slug !== teamSlug) {
        router.push(`/${orgSlug}/${slug}/settings`)
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update team")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 h-full flex flex-col">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}/${teamSlug}`)} className="h-8 px-2">
            <Users className="size-4 mr-2" />
            {currentTeam.name}
          </Button>
          <span>/</span>
          <span className="text-sm">Settings</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Team Settings</h2>
        <p className="text-muted-foreground">
          Manage your team's profile and members.
        </p>
      </div>
      
      <div className="mt-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Team Profile</CardTitle>
            <CardDescription>
              Update your team's name, URL slug, and description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input 
                id="teamName" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSlug">URL Slug</Label>
              <div className="flex items-center">
                <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">
                  {orgSlug}/
                </span>
                <Input 
                  id="teamSlug" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)} 
                  className="rounded-l-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDesc">Description</Label>
              <Textarea 
                id="teamDesc" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="What does this team do?"
                rows={3}
              />
            </div>
            <Button onClick={handleSave} disabled={isSaving || !name || !slug}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage who has access to this team and its workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembers teamId={currentTeam.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
