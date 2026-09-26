import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../../src/lib/ai/prompts'

describe('AI Grounding (Hallucination Prevention)', () => {
  it('instructs the model to never fabricate data', () => {
    const prompt = buildSystemPrompt("Acme Corp", "{}")
    
    expect(prompt).toContain('GROUNDING & HONESTY: Never fabricate data.')
    expect(prompt).toContain('I couldn\'t find that information in this workspace.')
    expect(prompt).toContain('Clearly distinguish FACTS from INFERENCE.')
  })
})
