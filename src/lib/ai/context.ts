import { createClient } from '@/lib/supabase/server'
import { embed } from 'ai'
import { getEmbeddingModel } from './provider'

import { AISource, resolveSourceUrl } from './sources'

export async function getWorkspaceContext(workspaceId: string, query: string = '', userId?: string) {
  const supabase = await createClient()

  const q = query.toLowerCase()
  const needsProjects = /project|health|progress|status/.test(q)
  const needsTeam = /team|who|member|workload|assign/.test(q)
  const needsOverdue = /overdue|late|deadline|due/.test(q)
  const needsBlocked = /block|stuck|wait/.test(q)
  const needsMyWork = /my|i |me/.test(q) && userId

  let boundedProjects: any[] = []
  if (needsProjects || (!needsTeam && !needsOverdue && !needsBlocked && !needsMyWork && q.length > 5)) {
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, priority, due_date')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(5)
    boundedProjects = data || []
  }

  let boundedMembers: any[] = []
  if (needsTeam) {
    const { data } = await supabase
      .from('workspace_members')
      .select(`user_id, role, profiles:user_id ( full_name )`)
      .eq('workspace_id', workspaceId)
      .limit(10)
    boundedMembers = data?.map(m => ({
      id: m.user_id,
      role: m.role,
      name: (m.profiles as any)?.full_name || 'Unknown'
    })) || []
  }

  let boundedTasks: any[] = []
  if (needsOverdue || needsBlocked || needsMyWork) {
    let tQuery = supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, assignee_id, project_id')
      .eq('workspace_id', workspaceId)
      .neq('status', 'Done')

    if (needsMyWork) {
      tQuery = tQuery.eq('assignee_id', userId)
    }
    if (needsBlocked) {
      tQuery = tQuery.eq('status', 'Blocked')
    } else if (needsOverdue) {
      tQuery = tQuery.lt('due_date', new Date().toISOString())
    }
    
    const { data } = await tQuery.limit(10)
    boundedTasks = data || []
  }
    
  // Semantic Search (Hybrid RAG) if API key is present and query exists
  let semanticMatches: AISource[] = []
  if (query && (process.env.OPENAI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)) {
    try {
      const embeddingModel = getEmbeddingModel()
      if (embeddingModel) {
        const { embedding } = await embed({
          model: embeddingModel,
          value: query,
        })
        
        const { data: matches } = await supabase.rpc('match_embeddings', {
          query_embedding: JSON.stringify(embedding) as any,
          match_threshold: 0.5,
          match_count: 5,
          p_workspace_id: workspaceId
        })
        
        if (matches) {
          semanticMatches = await Promise.all(matches.map(async (m: any) => {
            const url = await resolveSourceUrl(workspaceId, m.resource_type, m.resource_id, m.metadata?.project_id)
            return {
              id: m.resource_id,
              entityId: m.resource_id,
              type: m.resource_type,
              title: m.title || 'Unknown Resource',
              description: m.content_text, 
              workspaceId: workspaceId,
              sourceKind: 'semantic' as const,
              confidence: m.similarity,
              url
            }
          }))
        }
      }
    } catch (e) {
      console.error('Semantic search failed:', e)
    }
  }

  return {
    ...(boundedProjects.length > 0 && { projects: boundedProjects }),
    ...(boundedMembers.length > 0 && { members: boundedMembers }),
    ...(boundedTasks.length > 0 && { attentionTasks: boundedTasks }),
    ...(semanticMatches.length > 0 && { semanticKnowledge: semanticMatches })
  }
}

