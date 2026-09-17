import { useParams } from 'next/navigation'

import { useDataStore } from '@/stores/data-store'

export function useWorkspaceUrl(path?: string) {
  const params = useParams()
  const workspaces = useDataStore(s => s.workspaces);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  
  let orgSlug = params?.orgSlug as string
  let teamSlug = params?.teamSlug as string
  let workspaceSlug = params?.workspaceSlug as string

  // Handle 'undefined' strings coming from params
  if (orgSlug === 'undefined') orgSlug = ''
  if (teamSlug === 'undefined') teamSlug = ''
  if (workspaceSlug === 'undefined') workspaceSlug = ''

  // Fallback to active workspace if params are missing
  if (!orgSlug && currentWorkspace?.orgSlug) {
    orgSlug = currentWorkspace.orgSlug
    teamSlug = currentWorkspace.teamSlug || 'team'
    workspaceSlug = currentWorkspace.slug || ''
  }

  orgSlug = orgSlug || 'app'
  teamSlug = teamSlug || ''
  workspaceSlug = workspaceSlug || ''

  let base = `/${orgSlug}`
  if (teamSlug) base += `/${teamSlug}`
  if (workspaceSlug) base += `/${workspaceSlug}`

  base = base.replace(/\/+/g, '/').replace(/\/$/, '')

  if (path) {
    return `${base}${path.startsWith('/') ? path : `/${path}`}`
  }

  return base || '/app'
}
