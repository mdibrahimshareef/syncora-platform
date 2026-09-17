import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Goal = Database['public']['Tables']['goals']['Row']

export async function getGoals(supabase: SupabaseClient<Database>, orgId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      owner:owner_id(id, full_name, avatar_url)
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createGoal(
  supabase: SupabaseClient<Database>,
  payload: Omit<Database['public']['Tables']['goals']['Insert'], 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('goals')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateGoal(
  supabase: SupabaseClient<Database>,
  goalId: string,
  payload: Database['public']['Tables']['goals']['Update']
) {
  const { data, error } = await supabase
    .from('goals')
    .update(payload)
    .eq('id', goalId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteGoal(
  supabase: SupabaseClient<Database>,
  goalId: string
) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)

  if (error) throw error
}
