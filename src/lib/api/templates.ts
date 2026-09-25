import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type TemplateContent = {
  statuses: { name: string, color: string, position: number, category?: string, is_default?: boolean, allowed_transitions?: string[] }[],
  customFields?: { name: string, type: 'text' | 'number' | 'date' | 'select' | 'multi-select', options: any }[],
  tasks?: { title: string, status: string, priority: string, position: number, description?: string }[],
  taskTypes?: string[]
}

export type Template = Database['public']['Tables']['templates']['Row']

export async function getTemplates(supabase: SupabaseClient<Database>, domain?: string) {
  let query = supabase.from('templates').select('*')
  if (domain) {
    query = query.eq('domain', domain)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Template[]
}

export async function createProjectFromTemplate(
  supabase: SupabaseClient<Database>,
  templateId: string,
  workspaceId: string,
  payload: { name: string, description?: string, icon?: string, color?: string, userId: string, includeSampleData?: boolean }
) {
  // 1. Fetch template
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single()
    
  if (templateError) throw templateError
  
  const content = template.content as unknown as TemplateContent

  // 2. Create Project
  const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      workspace_id: workspaceId,
      name: payload.name,
      slug: slug,
      description: payload.description,
      status: 'Active',
      icon: payload.icon,
      color: payload.color,
      created_by: payload.userId,
      template_id: templateId,
      task_types: content.taskTypes || ['Task']
    } as any) // cast to any to bypass strict type checking until types are generated
    .select()
    .single()
    
  if (projectError) throw projectError

  // 3. Create Statuses
  if (content.statuses && content.statuses.length > 0) {
    const statusesToInsert = content.statuses.map(s => {
      let category = 'Todo';
      const name = s.name.toLowerCase();
      if (name.includes('progress') || name.includes('review') || name.includes('testing')) category = 'In Progress';
      else if (name.includes('done') || name.includes('complete')) category = 'Done';
      else if (name.includes('cancel')) category = 'Cancelled';

      return {
        project_id: project.id,
        name: s.name,
        color: s.color,
        position: s.position,
        category: s.category || category,
        is_default: s.is_default || false,
        allowed_transitions: s.allowed_transitions || []
      }
    })
    
    const { error: statusError } = await supabase
      .from('project_statuses')
      .insert(statusesToInsert as any) // cast to any until types are updated
      
    if (statusError) throw statusError
  }

  // 4. Create Custom Fields
  const fieldMap: Record<string, string> = {}
  if (content.customFields && content.customFields.length > 0) {
    const fieldsToInsert = content.customFields.map(f => ({
      workspace_id: workspaceId,
      project_id: project.id,
      name: f.name,
      type: f.type,
      options: f.options
    }))
    
    const { data: insertedFields, error: fieldsError } = await supabase
      .from('custom_field_definitions')
      .insert(fieldsToInsert)
      .select()
      
    if (fieldsError) throw fieldsError
    
    // map field names to IDs for later use if needed
    insertedFields.forEach(f => fieldMap[f.name] = f.id)
  }

  // 5. Create default tasks
  const shouldIncludeSampleData = payload.includeSampleData !== false;
  if (shouldIncludeSampleData && content.tasks && content.tasks.length > 0) {
    const tasksToInsert = content.tasks.map(t => ({
      project_id: project.id,
      workspace_id: workspaceId,
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      position: t.position,
      created_by: payload.userId
    }))
    
    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      
    if (tasksError) throw tasksError
  }

  return project
}
