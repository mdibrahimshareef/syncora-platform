import { createClient } from '@/lib/supabase/server'
import { embed } from 'ai'
import { getEmbeddingModel } from './provider'

import { AISource, resolveSourceUrl } from './sources'

export async function getWorkspaceContext(workspaceId: string, query: string = '') {
  const supabase = await createClient()

  // 1. Fetch active projects (lightweight baseline)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(15)

  // 2. Fetch workspace members (lightweight baseline)
  const { data: members } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      profiles:user_id ( full_name, email )
    `)
    .eq('workspace_id', workspaceId)
    .limit(30)
    
  // 3. Semantic Search (Hybrid RAG) if API key is present and query exists
  let semanticMatches: AISource[] = []
  if (query && process.env.AI_API_KEY) {
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
              description: m.content_text, // rename snippet to description for AISource parity
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
      // Fallback to structured context only
    }
  }

  return {
    projects: projects || [],
    members: members?.map(m => ({
      id: m.user_id,
      role: m.role,
      name: (m.profiles as any)?.full_name || 'Unknown',
      email: (m.profiles as any)?.email || 'Unknown'
    })) || [],
    semanticKnowledge: semanticMatches
  }
}

