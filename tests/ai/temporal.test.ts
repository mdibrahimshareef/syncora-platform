import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../../src/lib/ai/prompts'

describe('Temporal Awareness', () => {
  it('injects the current server time into the prompt', () => {
    const nowStr = new Date().toISOString().split('T')[0] // Get current date YYYY-MM-DD
    const prompt = buildSystemPrompt("Acme Corp", "{}")
    
    expect(prompt).toContain('Current Server Time:')
    expect(prompt).toContain(nowStr) // The model must receive today's date
  })
})
