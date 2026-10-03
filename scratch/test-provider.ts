import { getLanguageModel } from '../src/lib/ai/provider'

console.log('AI_PROVIDER:', process.env.AI_PROVIDER)
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length)
const model = getLanguageModel()
console.log('Model returned:', model ? 'defined' : 'undefined')
