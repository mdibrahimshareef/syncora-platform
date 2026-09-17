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
  if (!query || query.length < 2) return []

  const { data, error } = await supabase.rpc('global_search', {
    query_text: query,
    ws_id: workspaceId
  })

  if (error) throw error
  return (data as any[]).map(item => ({
    ...item,
    projectId: item.project_id
  })) as SearchResult[]
}
