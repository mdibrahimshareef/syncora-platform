import { streamText } from 'ai'

async function main() {
  console.log('Testing streamText return type...')
  try {
    const result = streamText({
      model: {
        provider: 'test',
        specificationVersion: 'v3',
        defaultObjectGenerationMode: 'json',
        doGenerate: async () => ({ text: 'test', usage: { promptTokens: 0, completionTokens: 0 } }),
        doStream: async () => ({ stream: new ReadableStream(), warnings: [] })
      } as any,
      prompt: 'Hello'
    })
    
    console.log('toDataStreamResponse exists:', typeof (result as any).toDataStreamResponse === 'function')
    console.log('toDataStream exists:', typeof (result as any).toDataStream === 'function')
    console.log('toUIMessageStreamResponse exists:', typeof (result as any).toUIMessageStreamResponse === 'function')
    console.log('toTextStreamResponse exists:', typeof (result as any).toTextStreamResponse === 'function')
    console.log('createUIMessageStreamResponse exists:', typeof require('ai').createUIMessageStreamResponse === 'function')
  } catch(e) {
    console.error(e)
  }
}

main()
