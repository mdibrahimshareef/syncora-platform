"use client"

import * as React from "react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { useParams, useRouter } from "next/navigation"
import { Building2, RefreshCw } from "lucide-react"
import { useDataStore } from "@/stores/data-store"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { updateOrganization } from "@/lib/api/organizations"
import { createClient } from "@/lib/supabase/client"
import { OrganizationMembers } from "@/components/settings/OrganizationMembers"

export default function OrganizationSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { organizations } = useOrganizationStore()
  const supabase = createClient()
  
  const orgSlug = params.orgSlug as string
  const currentOrg = organizations.find(o => o.slug === orgSlug)

  const [prevOrg, setPrevOrg] = React.useState(currentOrg)
  const [name, setName] = React.useState(currentOrg?.name || "")
  const [slug, setSlug] = React.useState(currentOrg?.slug || "")
  const [isSaving, setIsSaving] = React.useState(false)

  if (currentOrg && currentOrg !== prevOrg) {
    setPrevOrg(currentOrg)
    setName(currentOrg.name)
    setSlug(currentOrg.slug)
  }

  if (!currentOrg) return null

  const generateSlugFromName = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
  }

  const handleSave = async () => {
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)+/g, "")

    if (!cleanSlug) {
      toast.error("Please enter a valid URL slug (letters, numbers, and hyphens)")
      return
    }

    setIsSaving(true)
    try {
      await updateOrganization(supabase, currentOrg.id, { name, slug: cleanSlug })
      useOrganizationStore.getState().updateOrganization(currentOrg.id, { name, slug: cleanSlug })

      // Update workspaces in dataStore so all navigation links reflect the new slug
      useDataStore.setState((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.organizationId === currentOrg.id ? { ...w, orgSlug: cleanSlug } : w
        ),
      }))

      toast.success("Organization updated successfully")
      if (cleanSlug !== orgSlug) {
        router.push(`/${cleanSlug}/settings`)
        router.refresh()
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err?.code === "23505" || err?.message?.includes("unique") || err?.message?.includes("duplicate")) {
        toast.error("This URL slug is already taken. Please choose another one.")
      } else {
        toast.error(err?.message || "Failed to update organization")
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 h-full flex flex-col">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}`)} className="h-8 px-2">
            <Building2 className="size-4 mr-2" />
            {currentOrg.name}
          </Button>
          <span>/</span>
          <span className="text-sm">Settings</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Organization Settings</h2>
        <p className="text-muted-foreground">
          Manage your organization&apos;s general preferences and details.
        </p>
      </div>
      
      <div className="mt-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Update your organization&apos;s name and URL slug.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input 
                id="orgName" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="orgSlug">URL Slug</Label>
                {name && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSlug(generateSlugFromName(name))}
                  >
                    <RefreshCw className="size-3 mr-1" />
                    Sync with name
                  </Button>
                )}
              </div>
              <div className="flex items-center">
                <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">
                  syncora.app/
                </span>
                <Input 
                  id="orgSlug" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} 
                  className="rounded-l-none"
                  placeholder="acme-corp"
                />
              </div>
              <p className="text-[0.8rem] text-muted-foreground">
                Changing the slug will break existing links to your organization.
              </p>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !name || !slug}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Members section would go here */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription>
              Manage who has access to this organization. Members can be added to specific teams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationMembers orgId={currentOrg.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
