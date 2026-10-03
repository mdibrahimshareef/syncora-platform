import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { LanguageModel, EmbeddingModel } from 'ai'

export function getLanguageModel(): LanguageModel | undefined {
  const provider = process.env.AI_PROVIDER || 'mock'
  const modelName = process.env.AI_MODEL || (provider === 'google' ? 'gemini-flash-latest' : 'gpt-4o-mini')
  const openaiApiKey = process.env.OPENAI_API_KEY
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (provider === 'mock') {
    return undefined // Indicates mock mode
  }

  if (provider === 'openai') {
    if (!openaiApiKey) {
      throw new Error('OpenAI configuration error: OPENAI_API_KEY is missing.')
    }
    const openai = createOpenAI({ apiKey: openaiApiKey })
    return openai(modelName)
  }

  if (provider === 'google') {
    if (!googleApiKey) {
      throw new Error('Google AI configuration error: GOOGLE_GENERATIVE_AI_API_KEY is missing.')
    }
    const google = createGoogleGenerativeAI({ apiKey: googleApiKey })
    return google(modelName)
  }

  throw new Error(`Unsupported AI Provider: ${provider}`)
}

export function getEmbeddingModel(): EmbeddingModel | undefined {
  const provider = process.env.AI_PROVIDER || 'mock'
  const modelName = process.env.AI_EMBEDDING_MODEL || (provider === 'google' ? 'gemini-embedding-2' : 'text-embedding-3-small')
  const openaiApiKey = process.env.OPENAI_API_KEY
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (provider === 'mock') {
    return undefined
  }

  if (provider === 'openai') {
    if (!openaiApiKey) {
      throw new Error('OpenAI configuration error: OPENAI_API_KEY is missing.')
    }
    const openai = createOpenAI({ apiKey: openaiApiKey })
    return openai.embedding(modelName)
  }

  if (provider === 'google') {
    if (!googleApiKey) {
      throw new Error('Google AI configuration error: GOOGLE_GENERATIVE_AI_API_KEY is missing.')
    }
    const google = createGoogleGenerativeAI({ apiKey: googleApiKey })
    return google.textEmbeddingModel(modelName)
  }

  throw new Error(`Unsupported Embedding Provider: ${provider}`)
}
