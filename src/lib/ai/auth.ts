import { createClient } from '@/lib/supabase/server'

export async function verifyWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()

  // 1. Verify User Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized: User not authenticated.')
  }

  // 2. Verify Workspace Access via RLS
  // By querying the workspace, RLS will automatically filter out any workspaces the user does not have access to.
  // If the query returns 0 rows, the user is not a member of the workspace or the workspace doesn't exist.
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .single()

  if (workspaceError || !workspace) {
    throw new Error('Forbidden: User does not have access to this workspace or it does not exist.')
  }

  return { user, workspace }
}
