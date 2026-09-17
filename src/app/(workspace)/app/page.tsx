import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export default async function AppRedirectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const cookieStore = await cookies()
  const savedWorkspaceId = cookieStore.get('SYNCORA_workspace_id')?.value

  let query = supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(slug, organizations(slug), teams(slug))')
    .eq('user_id', user.id)
    
  if (savedWorkspaceId && savedWorkspaceId !== 'undefined' && savedWorkspaceId !== 'null') {
    // Only filter if it's a valid UUID string to prevent Postgres syntax errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(savedWorkspaceId)) {
      query = query.eq('workspace_id', savedWorkspaceId)
    }
  }
  
  let { data: memberWorkspaces, error } = await query.limit(1).maybeSingle()

  if (error) {
    console.error("Error fetching workspace for redirect:", error)
  }

  // If savedWorkspaceId was provided but not found, fallback to ANY workspace the user is a member of
  if (!memberWorkspaces && savedWorkspaceId) {
    const fallbackQuery = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(slug, organizations(slug), teams(slug))')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      
    if (fallbackQuery.data) {
      memberWorkspaces = fallbackQuery.data
    } else if (fallbackQuery.error) {
      console.error("Error on fallback workspace fetch:", fallbackQuery.error)
    }
  }

  if (memberWorkspaces?.workspaces) {
    // Note: teams(slug) will be an array because teams is a one-to-many from workspaces usually, 
    // or maybe workspaces has a team_id. Either way, fall back to 'team' if missing.
    const orgData = Array.isArray(memberWorkspaces.workspaces.organizations) ? memberWorkspaces.workspaces.organizations[0] : memberWorkspaces.workspaces.organizations
    const teamData = Array.isArray(memberWorkspaces.workspaces.teams) ? memberWorkspaces.workspaces.teams[0] : memberWorkspaces.workspaces.teams
    
    const orgSlug = orgData?.slug || 'org'
    const teamSlug = teamData?.slug || 'team'
    const wsSlug = memberWorkspaces.workspaces.slug || 'ws'
    
    redirect(`/${orgSlug}/${teamSlug}/${wsSlug}`)
  }

  redirect("/onboarding")
}
