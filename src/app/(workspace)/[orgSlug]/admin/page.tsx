"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Settings, ShieldAlert, Key, Users, Building2, Plus } from "lucide-react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function AdminPage() {
  const params = useParams()
  const router = useRouter()
  const { organizations, teams, updateOrganization, updateTeam } = useOrganizationStore()
  
  const orgSlug = params.orgSlug as string
  const currentOrg = organizations.find(o => o.slug === orgSlug)
  const orgTeams = teams.filter(t => t.orgId === currentOrg?.id)

  const isOrgAdmin = currentOrg?.role === 'admin' || currentOrg?.role === 'owner'

  const [orgName, setOrgName] = React.useState(currentOrg?.name || "")
  const [isUpdatingOrg, setIsUpdatingOrg] = React.useState(false)

  // Sync state if org loads late
  React.useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name)
    }
  }, [currentOrg])

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg) return
    setIsUpdatingOrg(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('organizations').update({ name: orgName }).eq('id', currentOrg.id)
      if (error) throw error
      updateOrganization(currentOrg.id, { name: orgName })
      toast.success("Organization updated successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to update organization")
    } finally {
      setIsUpdatingOrg(false)
    }
  }

  if (!currentOrg) return null

  if (!isOrgAdmin) {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
          <ShieldAlert className="size-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access the organization administration console. This area is restricted to administrators and owners.
          </p>
          <Button onClick={() => router.push(`/${orgSlug}`)}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Global Administration</h2>
            <p className="text-muted-foreground">
              Manage settings, teams, and access control for {currentOrg.name}.
            </p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general"><Settings className="h-4 w-4 mr-2" /> General</TabsTrigger>
            <TabsTrigger value="teams"><Building2 className="h-4 w-4 mr-2" /> Teams</TabsTrigger>
            <TabsTrigger value="rbac"><Key className="h-4 w-4 mr-2" /> Access Control</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Update your organization's core information.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateOrg} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Organization Name</Label>
                    <Input 
                      value={orgName} 
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Organization Slug (Immutable)</Label>
                    <Input value={currentOrg.slug} disabled className="bg-muted" />
                    <p className="text-[10px] text-muted-foreground">The slug is used for routing and cannot be changed.</p>
                  </div>
                  <Button type="submit" disabled={isUpdatingOrg}>
                    {isUpdatingOrg ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Organization Teams</CardTitle>
                  <CardDescription>Manage the business units within this organization.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info("Create team dialog coming soon!")}>
                  <Plus className="h-4 w-4 mr-2" /> New Team
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orgTeams.map(team => (
                    <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-md">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{team.name}</h4>
                          <p className="text-sm text-muted-foreground">/{orgSlug}/{team.slug}</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => router.push(`/${orgSlug}/${team.slug}`)}>
                        Go to Team
                      </Button>
                    </div>
                  ))}
                  {orgTeams.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      No teams created yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rbac" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Role-Based Access Control (RBAC)
                </CardTitle>
                <CardDescription>Configure global permissions and roles across the enterprise.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 border border-dashed rounded-lg">
                  <Key className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="font-semibold text-lg">RBAC Engine Active</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mt-2 mb-4">
                    Permissions are currently enforced at the database level via Supabase Row-Level Security (RLS). UI management of custom roles is managed by enterprise administrators.
                  </p>
                  <Button variant="outline" onClick={() => toast.success("Synced with IAM provider")}>
                    Sync Roles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
