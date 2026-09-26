import { NextResponse } from 'next/server'
import { orchestrateChatRequest } from '@/lib/ai/orchestrator'

export async function POST(req: Request) {
  try {
    const { messages, workspaceId, contextUrl, conversationId } = await req.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const orchestrationResult = await orchestrateChatRequest(workspaceId, messages, contextUrl, conversationId)

    if (orchestrationResult.isDevMode) {
      // Simulate network delay for UI testing
      await new Promise(resolve => setTimeout(resolve, 800))
      return NextResponse.json({
        isDevMode: true,
        message: orchestrationResult.message,
        sources: orchestrationResult.sources
      })
    }

    const headers: Record<string, string> = {}
    if (orchestrationResult.conversationId) {
      headers['X-Conversation-Id'] = orchestrationResult.conversationId
    }
    headers['X-Initial-Sources'] = JSON.stringify(orchestrationResult.sources || [])

    let response;
    // @ts-ignore
    if (typeof orchestrationResult.result!.toDataStreamResponse === 'function') {
      // @ts-ignore
      response = orchestrationResult.result!.toDataStreamResponse({ headers })
    } else if (typeof orchestrationResult.result!.toUIMessageStreamResponse === 'function') {
      // @ts-ignore
      response = orchestrationResult.result!.toUIMessageStreamResponse({ headers })
    } else {
      // Fallback
      // @ts-ignore
      response = orchestrationResult.result!.toTextStreamResponse({ headers })
    }
    return response

  } catch (error: any) {
    console.error("AI Chat API Error:", error)
    
    // Check if it's an Auth Error
    if (error.message?.includes('Auth Error')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
