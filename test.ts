import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

function Test() {
  useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    })
  })
}
