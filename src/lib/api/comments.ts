import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { Comment } from "@/types"

export async function getComments(supabase: SupabaseClient<Database>, taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      author:profiles!comments_author_id_fkey(id, full_name, avatar_url)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw error
  
  return data.map((c: Record<string, unknown>) => {
    const author = c.author as Record<string, unknown> | undefined;
    return {
      id: c.id as string,
      taskId: c.task_id as string,
      workspaceId: c.workspace_id as string,
      author: {
        id: author?.id as string,
        name: (author?.full_name as string) || 'Unknown User',
        initials: ((author?.full_name as string) || 'U').substring(0, 2).toUpperCase(),
      email: '',
      role: 'Member',
      avatarUrl: (author?.avatar_url as string) || undefined
    },
    body: c.body as string,
    createdAt: c.created_at as string,
    updatedAt: c.updated_at as string
  }
  })
}

export async function createComment(
  supabase: SupabaseClient<Database>, 
  payload: { taskId: string, workspaceId: string, authorId: string, body: string }
) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      task_id: payload.taskId,
      workspace_id: payload.workspaceId,
      author_id: payload.authorId,
      body: payload.body,
    })
    .select(`
      *,
      author:profiles!comments_author_id_fkey(id, full_name, avatar_url)
    `)
    .single()

  if (error) throw error
  
  return {
    id: data.id,
    taskId: data.task_id,
    workspaceId: data.workspace_id,
    author: {
      id: data.author?.id,
      name: data.author?.full_name || 'Unknown User',
      initials: (data.author?.full_name || 'U').substring(0, 2).toUpperCase(),
      email: '',
      role: 'Member',
      avatarUrl: data.author?.avatar_url || undefined
    },
    body: data.body,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Comment
}

export async function updateComment(
  supabase: SupabaseClient<Database>, 
  commentId: string, 
  body: string
) {
  const { data, error } = await supabase
    .from('comments')
    .update({ body, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteComment(supabase: SupabaseClient<Database>, commentId: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
  return true
}
