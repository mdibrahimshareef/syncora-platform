import { createClient } from '@/lib/supabase/server'
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'

export type AISource = {
  id: string;
  type: string;
  title: string;
  snippet: string;
  workspaceId: string;
  projectId?: string;
}

export async function getWorkspaceContext(workspaceId: string, query: string = '') {
  const supabase = await createClient()

  // 1. Fetch active projects (limit to 10 most recently updated)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, task_types')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(10)

  const projectIds = projects?.map(p => p.id) || []

  // 2. Fetch active tasks (limit to 20 most recent open tasks)
  let tasks: any[] = []
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority, task_type, created_at, updated_at, assignee_id, project_id')
      .in('project_id', projectIds)
      .neq('status', 'Done')
      .order('updated_at', { ascending: false })
      .limit(20)
    tasks = data || []
  }

  // 3. Fetch workspace members for context (limit to 20)
  const { data: members } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      profiles:user_id ( full_name, email )
    `)
    .eq('workspace_id', workspaceId)
    .limit(20)
    
  // 4. Semantic Search (Hybrid RAG) if API key is present and query exists
  let semanticMatches: AISource[] = []
  if (query && process.env.AI_API_KEY) {
    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: query,
      })
      
      const { data: matches } = await supabase.rpc('match_embeddings', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5,
        p_workspace_id: workspaceId
      })
      
      if (matches) {
        semanticMatches = matches.map((m: any) => ({
          id: m.resource_id,
          type: m.resource_type,
          title: m.title || 'Unknown Resource',
          snippet: m.content_text,
          workspaceId: workspaceId,
          projectId: m.metadata?.project_id
        }))
      }
    } catch (e) {
      console.error('Semantic search failed:', e)
      // Fallback to structured context only
    }
  }

  return {
    projects: projects || [],
    tasks: tasks || [],
    members: members?.map(m => ({
      id: m.user_id,
      role: m.role,
      name: (m.profiles as any)?.full_name || 'Unknown',
      email: (m.profiles as any)?.email || 'Unknown'
    })) || [],
    semanticKnowledge: semanticMatches
  }
}

