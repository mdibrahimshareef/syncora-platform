import { SupabaseClient } from '@supabase/supabase-js'
import { SavedFilter } from '@/types'

export async function getSavedFilters(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error fetching filters:', error)
    return []
  }

  return data.map(f => ({
    id: f.id,
    userId: f.user_id,
    workspaceId: f.workspace_id,
    name: f.name,
    filterData: f.filter_data,
    createdAt: f.created_at
  })) as SavedFilter[]
}

export async function saveFilter(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  name: string,
  filterData: any
) {
  const { data, error } = await supabase
    .from('saved_filters')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      name,
      filter_data: filterData
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving filter:', error)
    throw error
  }

  return {
    id: data.id,
    userId: data.user_id,
    workspaceId: data.workspace_id,
    name: data.name,
    filterData: data.filter_data,
    createdAt: data.created_at
  } as SavedFilter
}

export async function deleteFilter(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('saved_filters')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting filter:', error)
    throw error
  }
  return true
}
