import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"
import { createClient, createAdminClient } from "@/lib/supabase/server"
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

const isClockSkewError = (err: unknown) => {
  if (!err || typeof err !== 'object') return false
  const errorObj = err as { code?: string; message?: string }
  return (
    errorObj.code === 'PGRST303' ||
    (typeof errorObj.message === 'string' && errorObj.message.includes('JWT issued at future'))
  )
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

  const fetchLayoutData = async (client: typeof supabase) => {
    return Promise.all([
      client.from('profiles').select('*').eq('id', user.id).single(),
      client.from('workspace_members').select('workspace_id, role, workspaces(id, name, slug, organization_id, team_id, organizations(id, name, slug))').eq('user_id', user.id),
      client.from('organization_members').select('org_id, role, organizations(id, name, slug, logo_url, owner_id)').eq('user_id', user.id),
      client.from('team_members').select('team_id, role, teams(id, org_id, name, slug, description, icon)').eq('user_id', user.id)
    ])
  }

  let [
    { data: profile, error: profileError },
    { data: initialMemberWorkspaces, error: memberWorkspacesError },
    { data: memberOrgs, error: memberOrgsError },
    { data: memberTeams, error: memberTeamsError }
  ] = await fetchLayoutData(supabase)

  // Handle transient JWT clock skew (PGRST303 / "JWT issued at future")
  if (
    isClockSkewError(memberWorkspacesError) ||
    isClockSkewError(profileError) ||
    isClockSkewError(memberOrgsError) ||
    isClockSkewError(memberTeamsError)
  ) {
    // Wait briefly for clock skew to pass, then retry with user client
    await new Promise((resolve) => setTimeout(resolve, 600))
    const retryRes = await fetchLayoutData(supabase)

    if (
      !isClockSkewError(retryRes[1].error) &&
      !isClockSkewError(retryRes[0].error)
    ) {
      ;[
        { data: profile, error: profileError },
        { data: initialMemberWorkspaces, error: memberWorkspacesError },
        { data: memberOrgs, error: memberOrgsError },
        { data: memberTeams, error: memberTeamsError }
      ] = retryRes
    } else {
      // If clock drift persists between Auth and PostgREST containers,
      // safely use admin client strictly scoped to authenticated user.id
      const adminClient = createAdminClient()
      const adminRes = await fetchLayoutData(adminClient as unknown as typeof supabase)
      if (adminRes[1].data) {
        ;[
          { data: profile, error: profileError },
          { data: initialMemberWorkspaces, error: memberWorkspacesError },
          { data: memberOrgs, error: memberOrgsError },
          { data: memberTeams, error: memberTeamsError }
        ] = adminRes
      }
    }
  }

  let memberWorkspaces = initialMemberWorkspaces as unknown as WorkspaceMemberItem[] | null
  
  if (memberWorkspacesError && !isClockSkewError(memberWorkspacesError)) {
    console.error("Layout: Error fetching member workspaces:", memberWorkspacesError?.message || memberWorkspacesError)

    // Fallback: Query workspace_members with basic workspace fields only
    const { data: fallbackWorkspaces, error: fallbackError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, slug, organization_id, team_id)')
      .eq('user_id', user.id)

    if (!fallbackError && fallbackWorkspaces) {
      memberWorkspaces = fallbackWorkspaces as unknown as WorkspaceMemberItem[]
    } else if (fallbackError) {
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

  const mappedWorkspaces = memberWorkspaces?.filter((w) => w.workspaces).map((w) => {
    const ws = w.workspaces!
    const org = memberOrgs?.find((o) => o.organizations && o.organizations.id === ws.organization_id)?.organizations
    const team = memberTeams?.find((t) => t.teams && t.teams.id === ws.team_id)?.teams

    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      organizationId: ws.organization_id,
      teamId: ws.team_id || undefined,
      orgSlug: ws.organizations?.slug || org?.slug,
      teamSlug: ws.teams?.slug || team?.slug || 'team'
    }
  }) || []

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
