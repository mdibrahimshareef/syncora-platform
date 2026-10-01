import { createOpenAI } from '@ai-sdk/openai'
import { LanguageModel, EmbeddingModel } from 'ai'

export function getLanguageModel(): LanguageModel | undefined {
  const provider = process.env.AI_PROVIDER || 'mock'
  const modelName = process.env.AI_MODEL || 'gpt-4o-mini'
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY

  if (provider === 'mock' || !apiKey) {
    return undefined // Indicates mock mode
  }

  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey })
    return openai(modelName)
  }

  // If we wanted to support Google/Anthropic, we'd add them here
  // if (provider === 'google') return google(modelName)

  throw new Error(`Unsupported AI Provider: ${provider}`)
}

export function getEmbeddingModel(): EmbeddingModel | undefined {
  const provider = process.env.AI_PROVIDER || 'mock'
  const modelName = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small'
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY

  if (provider === 'mock' || !apiKey) {
    return undefined
  }

  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey })
    return openai.embedding(modelName)
  }

  throw new Error(`Unsupported Embedding Provider: ${provider}`)
}
