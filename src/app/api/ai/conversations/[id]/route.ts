import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
  }

  try {
    const authContext = await verifyWorkspaceAccess(workspaceId)
    const supabase = (await createClient()) as any

    // Ensure user owns conversation
    const { data: conv, error: convError } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', params.id)
      .eq('workspace_id', workspaceId)
      .eq('user_id', authContext.user.id)
      .single()

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('ai_messages')
      .select('id, role, content, tool_calls, created_at')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Reconstruct AI SDK Message format
    const messages = data.map((msg: any) => {
      const parts = []
      if (msg.content) {
        parts.push({ type: 'text', text: msg.content })
      }
      
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        msg.tool_calls.forEach((tc: any) => {
          parts.push(tc)
        })
      }

      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        parts: parts.length > 0 ? parts : undefined
      }
    })

    return NextResponse.json(messages)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
