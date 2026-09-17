import { NextResponse } from 'next/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { getWorkspaceContext } from '@/lib/ai/context'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { processChatRequest } from '@/lib/ai/provider'

export async function POST(req: Request) {
  try {
    const { messages, workspaceId } = await req.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // 1. Authenticate & Authorize
    let workspaceName = 'Workspace'
    try {
      const { workspace } = await verifyWorkspaceAccess(workspaceId)
      workspaceName = workspace.name
    } catch (authError: any) {
      return NextResponse.json({ error: authError.message }, { status: 403 })
    }

    // 2. Retrieve Workspace Context
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || ''
    const contextData = await getWorkspaceContext(workspaceId, lastUserMessage)
    const contextStr = JSON.stringify(contextData, null, 2)

    // 3. Build Prompt with Injection Protections
    const systemPrompt = buildSystemPrompt(workspaceName, contextStr)

    // 4. Process Request (Stream or Dev Mock)
    const providerResponse = await processChatRequest(messages, systemPrompt)

    if (providerResponse.isDevMode) {
      // Simulate network delay for UI testing
      await new Promise(resolve => setTimeout(resolve, 800))
      return NextResponse.json({
        isDevMode: true,
        message: providerResponse.content,
        sources: contextData.semanticKnowledge
      })
    }

    // Standard Vercel AI SDK streaming response
    const response = providerResponse.result!.toDataStreamResponse()
    
    // Pass sources in header
    if (contextData.semanticKnowledge && contextData.semanticKnowledge.length > 0) {
      // safely encode sources to avoid header parsing issues
      response.headers.set('x-ai-sources', Buffer.from(JSON.stringify(contextData.semanticKnowledge)).toString('base64'))
    }
    
    return response

  } catch (error: any) {
    console.error("AI Chat API Error:", error)
    return NextResponse.json(
      { error: error.message || 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
