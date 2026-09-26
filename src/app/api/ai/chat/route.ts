import { NextResponse } from 'next/server'
import { orchestrateChatRequest } from '@/lib/ai/orchestrator'

export async function POST(req: Request) {
  try {
    const { messages, workspaceId, contextUrl } = await req.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const orchestrationResult = await orchestrateChatRequest(workspaceId, messages, contextUrl)

    if (orchestrationResult.isDevMode) {
      // Simulate network delay for UI testing
      await new Promise(resolve => setTimeout(resolve, 800))
      return NextResponse.json({
        isDevMode: true,
        message: orchestrationResult.message,
        sources: orchestrationResult.sources
      })
    }

    // Standard Vercel AI SDK streaming response
    const response = orchestrationResult.result!.toDataStreamResponse()
    
    // Pass sources in header
    if (orchestrationResult.sources && orchestrationResult.sources.length > 0) {
      // safely encode sources to avoid header parsing issues
      response.headers.set('x-ai-sources', Buffer.from(JSON.stringify(orchestrationResult.sources)).toString('base64'))
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
