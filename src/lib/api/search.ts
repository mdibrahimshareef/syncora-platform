import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type SearchResult = {
  type: string
  id: string
  title: string
  description: string
  link: string
  projectId?: string
  subtitle?: string
}

export async function performGlobalSearch(supabase: SupabaseClient<Database>, workspaceId: string, query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const trimmedQuery = query.trim()

  try {
    const { data, error } = await supabase.rpc('global_search', {
      query_text: trimmedQuery,
      ws_id: workspaceId
    })

    if (!error && Array.isArray(data) && data.length > 0) {
      return (data as any[]).map(item => ({
        ...item,
        projectId: item.project_id
      })) as SearchResult[]
    }
  } catch (rpcErr) {
    console.warn("Global search RPC error, falling back to direct table queries:", rpcErr)
  }

  // Resilient fallback: Query projects and tasks directly in the active workspace
  try {
    const [projectsRes, tasksRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, description')
        .eq('workspace_id', workspaceId)
        .ilike('name', `%${trimmedQuery}%`)
        .limit(10),
      supabase
        .from('tasks')
        .select('id, title, description, project_id, projects!inner(workspace_id)')
        .eq('projects.workspace_id', workspaceId)
        .ilike('title', `%${trimmedQuery}%`)
        .limit(10)
    ])

    const results: SearchResult[] = []

    if (projectsRes.data) {
      projectsRes.data.forEach((p: any) => {
        results.push({
          type: 'project',
          id: p.id,
          title: p.name,
          description: p.description || '',
          link: `/projects/${p.id}`
        })
      })
    }

    if (tasksRes.data) {
      tasksRes.data.forEach((t: any) => {
        results.push({
          type: 'task',
          id: t.id,
          title: t.title,
          description: t.description || '',
          link: `/projects/${t.project_id}?task=${t.id}`,
          projectId: t.project_id
        })
      })
    }

    return results
  } catch (fallbackErr) {
    console.error("Direct search fallback error:", fallbackErr)
    return []
  }
}
