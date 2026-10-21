import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"
import { createClient } from "@/lib/supabase/server"
import { StoreInitializer } from "@/components/providers/StoreInitializer"
import { cookies } from "next/headers"

interface WorkspaceMemberItem {
  workspace_id: string
  role: string | null
  workspaces: {
    id: string
    name: string
    slug: string
    organization_id: string
    team_id?: string | null
    organizations?: { id: string; name: string; slug: string } | null
    teams?: { id: string; name: string; slug: string } | null
  } | null
}

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Check if they have an active workspace cookie
  const cookieStore = await cookies()
  const savedWorkspaceId = cookieStore.get('SYNCORA_workspace_id')?.value

  const [
    { data: profile },
    { data: initialMemberWorkspaces, error: memberWorkspacesError },
    { data: memberOrgs },
    { data: memberTeams }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('workspace_members').select('workspace_id, role, workspaces(id, name, slug, organization_id, team_id, organizations(id, name, slug), teams(id, name, slug))').eq('user_id', user.id),
    supabase.from('organization_members').select('org_id, role, organizations(id, name, slug, logo_url, owner_id)').eq('user_id', user.id),
    supabase.from('team_members').select('team_id, role, teams(id, org_id, name, slug, description, icon)').eq('user_id', user.id)
  ])

  let memberWorkspaces = initialMemberWorkspaces as unknown as WorkspaceMemberItem[] | null
  
  if (memberWorkspacesError) {
    console.error("Layout: Error fetching member workspaces with embedded relations:", {
      message: memberWorkspacesError.message,
      code: memberWorkspacesError.code,
      details: memberWorkspacesError.details,
      hint: memberWorkspacesError.hint,
    })

    // Fallback: Query workspace_members without deep nested teams relationship
    const { data: fallbackWorkspaces, error: fallbackError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, slug, organization_id, team_id, organizations(id, name, slug))')
      .eq('user_id', user.id)

    if (!fallbackError && fallbackWorkspaces) {
      memberWorkspaces = fallbackWorkspaces as unknown as WorkspaceMemberItem[]
    } else {
      console.error("Layout: Fallback workspace fetch also failed:", fallbackError?.message || fallbackError?.code)
    }
  }

  let activeWorkspaceId = null
  let activeWorkspaceRole = 'Member'

  if (memberWorkspaces && memberWorkspaces.length > 0) {
    if (savedWorkspaceId && memberWorkspaces.some((w) => w.workspace_id === savedWorkspaceId)) {
      activeWorkspaceId = savedWorkspaceId
      activeWorkspaceRole = memberWorkspaces.find((w) => w.workspace_id === savedWorkspaceId)?.role || 'Member'
    } else {
      activeWorkspaceId = memberWorkspaces[0].workspace_id
      activeWorkspaceRole = memberWorkspaces[0].role || 'Member'
    }
  }

  if (!activeWorkspaceId && memberWorkspaces && memberWorkspaces.length === 0) {
    redirect("/onboarding")
  }

  const currentUser = {
    id: user.id,
    name: profile?.full_name || 'User',
    initials: (profile?.full_name || 'U').substring(0, 2).toUpperCase(),
    email: user.email || '',
    role: activeWorkspaceRole,
    avatarUrl: profile?.avatar_url || undefined,
    metadata: (profile?.metadata as Record<string, unknown>) || {}
  }

  const mappedWorkspaces = memberWorkspaces?.filter((w) => w.workspaces).map((w) => ({
    id: w.workspaces!.id,
    name: w.workspaces!.name,
    slug: w.workspaces!.slug,
    organizationId: w.workspaces!.organization_id,
    teamId: w.workspaces!.team_id || undefined,
    orgSlug: w.workspaces!.organizations?.slug,
    teamSlug: w.workspaces!.teams?.slug || 'team'
  })) || []

  const mappedOrganizations = memberOrgs?.filter(o => o.organizations).map(o => ({
    id: o.organizations!.id,
    name: o.organizations!.name,
    slug: o.organizations!.slug,
    logoUrl: o.organizations!.logo_url || undefined,
    ownerId: o.organizations!.owner_id || undefined,
    role: o.role
  })) || []

  const mappedTeams = memberTeams?.filter(t => t.teams).map(t => ({
    id: t.teams!.id,
    orgId: t.teams!.org_id,
    name: t.teams!.name,
    slug: t.teams!.slug,
    description: t.teams!.description || undefined,
    icon: t.teams!.icon || undefined,
    role: t.role
  })) || []

  return (
    <>
      <StoreInitializer 
        currentUser={currentUser} 
        activeWorkspaceId={activeWorkspaceId} 
        workspaces={mappedWorkspaces}
        organizations={mappedOrganizations}
        teams={mappedTeams}
      />
      <AppShell>{children}</AppShell>
    </>
  )
}
