import { streamText, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { aiTools } from './tools'

export async function processChatRequest(messages: any[], systemPrompt: string) {
  const provider = process.env.AI_PROVIDER || 'mock'
  const isDevMode = provider === 'mock' || !process.env.AI_API_KEY

  if (isDevMode) {
    // DEVELOPMENT MODE: Return a deterministic mock response without using real LLMs
    // Since we can't easily stream a mocked Response compatible with Vercel AI SDK's `streamText`
    // using purely sync code, we'll return a standard JSON response that the client must handle.
    return {
      isDevMode: true,
      content: `[DEVELOPMENT MODE] I am running in mock mode because no AI API key is configured.\n\nBased on the system prompt and workspace context, I can see your data, but I am unable to analyze it dynamically. To enable real AI, set AI_PROVIDER='openai' and configure AI_API_KEY.`
    }
  }

  // REAL LLM PROVIDER
  if (provider === 'openai') {
    const result = streamText({
      model: openai(process.env.AI_MODEL || 'gpt-4o-mini'),
      system: systemPrompt,
      messages,
      tools: aiTools,
      maxSteps: 2, // Allow the model to call a tool and then optionally respond
    })

    return {
      isDevMode: false,
      result
    }
  }

  throw new Error(`Unsupported AI Provider: ${provider}`)
}
