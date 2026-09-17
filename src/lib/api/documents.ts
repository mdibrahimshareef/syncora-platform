import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Document = Database['public']['Tables']['documents']['Row']

export async function getDocuments(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      author:author_id(id, full_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getDocumentById(supabase: SupabaseClient<Database>, docId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      author:author_id(id, full_name, avatar_url)
    `)
    .eq('id', docId)
    .single()

  if (error) throw error
  return data
}

export async function createDocument(
  supabase: SupabaseClient<Database>,
  payload: Omit<Database['public']['Tables']['documents']['Insert'], 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('documents')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDocument(
  supabase: SupabaseClient<Database>,
  docId: string,
  payload: Database['public']['Tables']['documents']['Update']
) {
  const { data, error } = await supabase
    .from('documents')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', docId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDocument(
  supabase: SupabaseClient<Database>,
  docId: string
) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId)

  if (error) throw error
}
