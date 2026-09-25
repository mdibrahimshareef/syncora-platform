import { openai } from '@ai-sdk/openai'
import { LanguageModel, EmbeddingModel } from 'ai'

export function getLanguageModel(): LanguageModel | undefined {
  const provider = process.env.AI_PROVIDER || 'mock'
  const modelName = process.env.AI_MODEL || 'gpt-4o-mini'

  if (provider === 'mock' || !process.env.AI_API_KEY) {
    return undefined // Indicates mock mode
  }

  if (provider === 'openai') {
    return openai(modelName)
  }

  // If we wanted to support Google/Anthropic, we'd add them here
  // if (provider === 'google') return google(modelName)

  throw new Error(`Unsupported AI Provider: ${provider}`)
}

export function getEmbeddingModel(): EmbeddingModel | undefined {
  const provider = process.env.AI_PROVIDER || 'mock'
  const modelName = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small'

  if (provider === 'mock' || !process.env.AI_API_KEY) {
    return undefined
  }

  if (provider === 'openai') {
    return openai.embedding(modelName)
  }

  throw new Error(`Unsupported Embedding Provider: ${provider}`)
}
