import { describe, it, expect, vi } from 'vitest'
import { orchestrateChatRequest } from '@/lib/ai/orchestrator'
import * as auth from '@/lib/ai/auth'
import * as context from '@/lib/ai/context'
import * as governance from '@/lib/ai/governance'
import { createMockSupabase, createChainable } from './mock-supabase'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/ai/auth', () => ({
  verifyWorkspaceAccess: vi.fn()
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/ai/governance', () => ({
  validateAIRequest: vi.fn().mockResolvedValue(true),
  recordAIUsage: vi.fn().mockResolvedValue(true)
}))

describe('Orchestrator Integration Flow', () => {
  it('handles message normalization and streamText setup', async () => {
    vi.mocked(auth.verifyWorkspaceAccess).mockResolvedValue({
      workspace: { id: 'ws-1', name: 'Test Workspace' } as any,
      user: { id: 'user-1', role: 'admin' } as any
    })

    const mockSupabase = createMockSupabase({
      'projects': () => createChainable([{ id: 'p-1', name: 'Project 1' }]),
      'tasks': () => createChainable([{ id: 't-1', title: 'Task 1', status: 'Todo' }]),
      'workspace_members': () => createChainable([{ user_id: 'user-1' }])
    })
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

    // Test normalization with raw message
    const rawMessages = [{ role: 'user', content: 'hi' }]
    const normalized = rawMessages.map((m: any) => ({
      ...m,
      parts: m.parts || [{ type: 'text', text: m.content || '' }]
    }))
    // Test incomplete tool call filtering
    const incompleteMessages = [
      { role: 'user', parts: [{ type: 'text', text: 'help' }] },
      { role: 'assistant', parts: [{ type: 'tool-get_work', toolName: 'get_work', toolCallId: 'c1', state: 'call' }] }
    ]
    const { convertToModelMessages } = await import('ai')
    const coreWithIncomplete = await convertToModelMessages(incompleteMessages as any, { ignoreIncompleteToolCalls: true })
    expect(coreWithIncomplete).toBeDefined()

    // Test calling orchestrateChatRequest directly with raw messages
    process.env.AI_PROVIDER = 'mock'
    const result = await orchestrateChatRequest('ws-1', [{ role: 'user', content: 'hi' }])
    expect(result.isDevMode).toBe(true)
    expect(result.message).toContain('DEVELOPMENT MODE')
  })
})
