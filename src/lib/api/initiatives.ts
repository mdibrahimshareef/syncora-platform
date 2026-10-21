import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Initiative = Database['public']['Tables']['initiatives']['Row'] & {
  progress?: number | null
  owner?: { id?: string; full_name?: string | null; avatar_url?: string | null } | null
}

export async function getInitiatives(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Initiative[]> {
  const { data, error } = await supabase
    .from('initiatives')
    .select('*')
    .eq('org_id', workspaceId)

  if (error) throw error
  return (data || []) as Initiative[]
}
