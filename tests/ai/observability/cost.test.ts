import { describe, it, expect } from 'vitest';
import { calculateModelCost, MODEL_PRICING_TABLE } from '../../../src/lib/ai/cost';

describe('Release 4.8 Resource Governance: Centralized Cost Engine (Section 7)', () => {
  it('accurately calculates costs for known models using explicit pricing table', () => {
    // 100,000 input tokens and 50,000 output tokens on gpt-4o-mini
    // Input: (100,000 / 1,000,000) * 0.15 = 0.015
    // Output: (50,000 / 1,000,000) * 0.60 = 0.030
    // Total = 0.045
    const miniCost = calculateModelCost({
      model: 'gpt-4o-mini',
      provider: 'openai',
      inputTokens: 100000,
      outputTokens: 50000,
      isProviderReported: true
    });

    expect(miniCost.pricingFound).toBe(true);
    expect(miniCost.estimatedCost).toBeCloseTo(0.045, 4);
    expect(miniCost.currency).toBe('USD');
    expect(miniCost.usageReportedByProvider).toBe(true);
    expect(miniCost.qualificationNotice).toContain('Not an invoice-accurate bill');
  });

  it('accurately calculates costs for Google Gemini models', () => {
    // gemini-3.5-flash: 0.10 / 1M in, 0.40 / 1M out
    const geminiCost = calculateModelCost({
      model: 'gemini-3.5-flash',
      provider: 'google',
      inputTokens: 500000,
      outputTokens: 100000,
      isProviderReported: true
    });

    // In: (500,000 / 1M) * 0.10 = 0.05
    // Out: (100,000 / 1M) * 0.40 = 0.04
    // Total = 0.09
    expect(geminiCost.pricingFound).toBe(true);
    expect(geminiCost.estimatedCost).toBeCloseTo(0.09, 4);
  });

  it('distinguishes provider-reported token counts from unverified estimates', () => {
    const unverifiedCost = calculateModelCost({
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 1000,
      outputTokens: 500,
      isProviderReported: false
    });

    expect(unverifiedCost.usageReportedByProvider).toBe(false);
    expect(unverifiedCost.qualificationNotice).toContain('Provider did not return exact usage counters');
  });

  it('safely handles unknown or unpriced models without throwing exceptions', () => {
    const unknownCost = calculateModelCost({
      model: 'speculative-llm-ultra-9000',
      provider: 'custom',
      inputTokens: 10000,
      outputTokens: 5000
    });

    expect(unknownCost.pricingFound).toBe(false);
    expect(unknownCost.estimatedCost).toBe(0);
    expect(unknownCost.qualificationNotice).toContain('Pricing metadata unavailable');
  });

  it('records zero cost for mock model', () => {
    const mockCost = calculateModelCost({
      model: 'mock',
      provider: 'mock',
      inputTokens: 50000,
      outputTokens: 25000,
      isProviderReported: true
    });

    expect(mockCost.pricingFound).toBe(true);
    expect(mockCost.estimatedCost).toBe(0);
  });
});
