import { createClient } from '@/lib/supabase/server'

export type SourceKind = 'database' | 'semantic' | 'analysis' | 'tool'

export type AISource = {
  id: string
  type:
    | 'task'
    | 'project'
    | 'milestone'
    | 'user'
    | 'time_entry'
    | 'timesheet'
    | 'budget'
    | 'request'
    | 'approval'
    | 'automation'
    | 'document'
    | 'activity'
    | 'workspace'
    | 'semantic'
  title: string
  description?: string
  workspaceId: string
  entityId?: string
  url?: string
  sourceKind: SourceKind
  confidence?: number
}

/**
 * Resolves canonical Syncora URLs for entities based on workspace routing.
 */
export async function resolveSourceUrl(
  workspaceId: string,
  type: AISource['type'],
  entityId: string,
  projectId?: string
): Promise<string | undefined> {
  const supabase = await createClient()
  
  // Fetch workspace routing slugs
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('slug, organization_id, team_id')
    .eq('id', workspaceId)
    .single()

  if (!workspace) return undefined

  // For the sake of this implementation, we assume org and team slugs are fetched or mocked.
  // We'll mimic the frontend fallback if not directly joined.
  // In a real database, we'd join with organizations and teams.
  let orgSlug = 'org'
  let teamSlug = 'team'

  if (workspace.organization_id) {
    const { data: org } = await supabase.from('organizations').select('slug').eq('id', workspace.organization_id).single()
    if (org?.slug) orgSlug = org.slug
  }
  
  if (workspace.team_id) {
    const { data: team } = await supabase.from('teams').select('slug').eq('id', workspace.team_id).single()
    if (team?.slug) teamSlug = team.slug
  }

  const base = `/${orgSlug}/${teamSlug}/${workspace.slug}`

  switch (type) {
    case 'project':
      return `${base}/projects/${entityId}`
    case 'task':
      if (projectId) return `${base}/projects/${projectId}?task=${entityId}`
      // If we don't have projectId, we might have to look it up, but let's avoid DB calls if possible.
      // We will look it up if it's missing.
      const { data: task } = await supabase.from('tasks').select('project_id').eq('id', entityId).single()
      if (task?.project_id) return `${base}/projects/${task.project_id}?task=${entityId}`
      return undefined
    case 'document':
      return `${base}/docs/${entityId}`
    default:
      // Entities like automations, budgets, workload don't have direct clickable routes
      return undefined
  }
}

/**
 * Centralized source deduplication.
 * Resolves by exact identity: workspaceId + type + entityId
 * Prefers 'database' and 'tool' sources over 'semantic' duplicates.
 */
export function deduplicateSources(sources: AISource[]): AISource[] {
  const unique = new Map<string, AISource>()
  
  for (const src of sources) {
    // If no entityId, fallback to the generic id for deduplication
    const dedupeKey = `${src.workspaceId}:${src.type}:${src.entityId || src.id}`
    
    const existing = unique.get(dedupeKey)
    if (!existing) {
      unique.set(dedupeKey, src)
    } else {
      // Overwrite if new source is more authoritative (database/tool > semantic)
      if (existing.sourceKind === 'semantic' && src.sourceKind !== 'semantic') {
        unique.set(dedupeKey, src)
      }
    }
  }
  
  return Array.from(unique.values())
}
