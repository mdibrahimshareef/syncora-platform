import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { getWorkspaceContext } from '@/lib/ai/context'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { getLanguageModel } from '@/lib/ai/provider'
import { getAiTools } from '@/lib/ai/tools'
import { logAITelemetry } from '@/lib/ai/telemetry'
// @ts-ignore
import { streamText, isStepCount, StreamData } from 'ai'
import { getTemporalContext } from '@/lib/ai/time'
import { classifyIntent } from '@/lib/ai/intent'
import { deduplicateSources, AISource } from './sources'
import { saveConversation } from './persistence'

export async function orchestrateChatRequest(workspaceId: string, messages: any[], contextUrl: string = '', conversationId?: string) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  // 1. Authenticate & Authorize
  let workspaceName = 'Workspace'
  let userId = undefined
  let userRole = undefined
  try {
    const { workspace, user } = await verifyWorkspaceAccess(workspaceId)
    workspaceName = workspace.name
    userId = user.id
    userRole = user.role // Assume role exists or it's safely undefined
  } catch (authError: any) {
    logAITelemetry({ requestId, workspaceId, model: 'unknown', latencyMs: Date.now() - startTime, toolCallsCount: 0, success: false, errorCategory: 'AUTH_ERROR' })
    throw new Error(`Auth Error: ${authError.message}`)
  }

  // 2. Classify Intent
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || ''
  const intent = classifyIntent(lastUserMessage)
  
  // 3. Retrieve Workspace Context & Temporal Context
  try {
    const contextData = await getWorkspaceContext(workspaceId, lastUserMessage)
    // Only pass semantic knowledge to the LLM to avoid eager loading entire tables
    const contextToPass = { semanticKnowledge: contextData.semanticKnowledge }
    const contextStr = JSON.stringify(contextToPass, null, 2)
    const temporalContext = getTemporalContext()

    // 4. Build Prompt with Injection Protections
    // Append contextUrl to the prompt so the AI knows where the user is looking.
    const urlContextStr = contextUrl ? `\nThe user is currently viewing this URL path: ${contextUrl}` : ''
    const systemPrompt = buildSystemPrompt(workspaceName, contextStr, userRole, temporalContext) + urlContextStr

    // 5. Resolve Model
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
    const streamData = new StreamData()
    let collectedSources: AISource[] = [...contextData.semanticKnowledge]

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: getAiTools(workspaceId, userId) as any,
      stopWhen: isStepCount(5), // Allow multi-step tool execution
      onStepFinish: (event) => {
        // Collect sources from tools
        for (const res of event.toolResults) {
          // @ts-ignore
          if (res.result?.sources) {
            // @ts-ignore
            collectedSources.push(...res.result.sources)
          }
        }
      },
      onFinish: async (event) => {
        // Deduplicate and resolve best sources
        const finalSources = deduplicateSources(collectedSources)
        if (finalSources.length > 0) {
          streamData.append({ type: 'sources', sources: finalSources })
        }
        
        logAITelemetry({
          requestId,
          userId,
          workspaceId,
          model: modelName,
          latencyMs: Date.now() - startTime,
          toolCallsCount: event.toolCalls?.length || 0,
          success: true
        })

        if (userId) {
          // Append the final assistant message to the chain and save
          const allMessages = [...messages, { role: 'assistant', content: event.text, parts: event.toolCalls || [] }]
          try {
            const savedConvId = await saveConversation(workspaceId, userId, conversationId, 'Workspace Chat', allMessages)
            if (savedConvId) {
              streamData.append({ type: 'conversation_id', conversationId: savedConvId })
            }
          } catch (err) {
            console.error('Failed to persist conversation', err)
          }
        }

        streamData.close()
      }
    })

    return {
      isDevMode: false,
      result,
      streamData
    }
  } catch (error: any) {
    logAITelemetry({ requestId, userId, workspaceId, model: process.env.AI_MODEL || 'unknown', latencyMs: Date.now() - startTime, toolCallsCount: 0, success: false, errorCategory: 'EXECUTION_ERROR' })
    throw error
  }
}

