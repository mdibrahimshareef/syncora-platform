import { createClient } from '@/lib/supabase/server'

export async function saveConversation(
  workspaceId: string,
  userId: string,
  conversationId: string | undefined,
  title: string,
  messages: any[]
) {
  const supabase = (await createClient()) as any

  let finalConvId = conversationId

  // Create conversation if it doesn't exist
  if (!finalConvId) {
    const { data: conv, error: convError } = await supabase
      .from('ai_conversations')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        title: title || 'New Conversation'
      })
      .select('id')
      .single()

    if (convError || !conv) {
      console.error('Failed to create ai_conversation', convError)
      return null
    }
    finalConvId = conv.id
  } else {
    // Update updated_at
    await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', finalConvId)
  }

  // Delete all existing messages for this conversation to prevent duplicate append issues,
  // or smartly diff. To keep it simple and bounded, we wipe and rewrite the bounded context.
  await supabase.from('ai_messages').delete().eq('conversation_id', finalConvId)

  const messageInserts = messages.map(msg => {
    // Extract tool calls to save in jsonb
    const toolCalls = msg.parts?.filter((p: any) => p.type !== 'text') || []
    const content = msg.parts?.find((p: any) => p.type === 'text')?.text || msg.content || ''
    return {
      conversation_id: finalConvId,
      role: msg.role,
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : null
    }
  })

  const { error: msgError } = await supabase.from('ai_messages').insert(messageInserts)
  if (msgError) {
    console.error('Failed to insert ai_messages', msgError)
  }

  return finalConvId
}
