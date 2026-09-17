import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export async function getInitiatives(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('initiatives')
    .select('*')
    .eq('org_id', workspaceId)

  if (error) throw error
  return data
}
