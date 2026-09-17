import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type CustomFieldDefinition = Database['public']['Tables']['custom_field_definitions']['Row']
export type TaskCustomField = Database['public']['Tables']['task_custom_fields']['Row']

export async function getCustomFieldDefinitions(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  projectId?: string
) {
  let query = supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (projectId) {
    // get workspace fields AND project-specific fields
    query = query.or(`project_id.is.null,project_id.eq.${projectId}`)
  } else {
    query = query.is('project_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTaskCustomFields(
  supabase: SupabaseClient<Database>,
  taskId: string
) {
  const { data, error } = await supabase
    .from('task_custom_fields')
    .select('*, custom_field_definitions(*)')
    .eq('task_id', taskId)

  if (error) throw error
  return data
}

export async function setTaskCustomField(
  supabase: SupabaseClient<Database>,
  taskId: string,
  fieldId: string,
  value: any
) {
  const { data, error } = await supabase
    .from('task_custom_fields')
    .upsert({
      task_id: taskId,
      field_id: fieldId,
      value: value
    }, { onConflict: 'task_id, field_id' })
    .select()
    .single()

  if (error) throw error
  return data
}
