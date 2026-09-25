import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { getWorkspaceContext } from '@/lib/ai/context'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { getLanguageModel } from '@/lib/ai/provider'
import { getAiTools } from '@/lib/ai/tools'
import { logAITelemetry } from '@/lib/ai/telemetry'
import { streamText } from 'ai'

export async function orchestrateChatRequest(workspaceId: string, messages: any[], contextUrl: string = '') {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  // 1. Authenticate & Authorize
  let workspaceName = 'Workspace'
  let userId = undefined
  try {
    const { workspace, user } = await verifyWorkspaceAccess(workspaceId)
    workspaceName = workspace.name
    userId = user.id
  } catch (authError: any) {
    logAITelemetry({ requestId, workspaceId, model: 'unknown', latencyMs: Date.now() - startTime, toolCallsCount: 0, success: false, errorCategory: 'AUTH_ERROR' })
    throw new Error(`Auth Error: ${authError.message}`)
  }

  // 2. Classify Intent & Retrieve Workspace Context
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || ''
  
  try {
    const contextData = await getWorkspaceContext(workspaceId, lastUserMessage)
    const contextStr = JSON.stringify(contextData, null, 2)

    // 3. Build Prompt with Injection Protections
    // Append contextUrl to the prompt so the AI knows where the user is looking.
    const urlContextStr = contextUrl ? `\nThe user is currently viewing this URL path: ${contextUrl}` : ''
    const systemPrompt = buildSystemPrompt(workspaceName, contextStr) + urlContextStr

    // 4. Resolve Model
    const model = getLanguageModel()
    const modelName = process.env.AI_MODEL || 'gpt-4o-mini'

    // 5. Mock / Development Mode
    if (!model) {
      logAITelemetry({ requestId, userId, workspaceId, model: 'mock', latencyMs: Date.now() - startTime, toolCallsCount: 0, success: true })
      return {
        isDevMode: true,
        message: `[DEVELOPMENT MODE] I am running in mock mode because no AI API key is configured.\n\nBased on the system prompt and workspace context, I can see your data, but I am unable to analyze it dynamically. To enable real AI, set AI_PROVIDER='openai' and configure AI_API_KEY.`,
        sources: contextData.semanticKnowledge
      }
    }

    // 6. Execute via Vercel AI SDK
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: getAiTools(workspaceId) as any,
      maxSteps: 3,
      onFinish: (event) => {
        logAITelemetry({
          requestId,
          userId,
          workspaceId,
          model: modelName,
          latencyMs: Date.now() - startTime,
          toolCallsCount: event.toolCalls?.length || 0,
          success: true
        })
      }
    })

    return {
      isDevMode: false,
      result,
      sources: contextData.semanticKnowledge
    }
  } catch (error: any) {
    logAITelemetry({ requestId, userId, workspaceId, model: process.env.AI_MODEL || 'unknown', latencyMs: Date.now() - startTime, toolCallsCount: 0, success: false, errorCategory: 'EXECUTION_ERROR' })
    throw error
  }
}

