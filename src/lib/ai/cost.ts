export type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  currency: 'USD';
  lastUpdated: string;
};

/**
 * Authoritative centralized model pricing table (USD per 1,000,000 tokens).
 * Update schedule: Review quarterly or upon official provider pricing announcements.
 */
export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o-mini': {
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
    currency: 'USD',
    lastUpdated: '2026-10-01'
  },
  'gpt-4o': {
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
    currency: 'USD',
    lastUpdated: '2026-10-01'
  },
  // Google Gemini Models
  'gemini-3.5-flash': {
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    currency: 'USD',
    lastUpdated: '2026-10-01'
  },
  'gemini-1.5-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    currency: 'USD',
    lastUpdated: '2026-10-01'
  },
  'gemini-1.5-pro': {
    inputPerMillion: 1.25,
    outputPerMillion: 5.00,
    currency: 'USD',
    lastUpdated: '2026-10-01'
  },
  // Mock / Internal Development
  'mock': {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
    currency: 'USD',
    lastUpdated: '2026-10-01'
  }
};

export type CostCalculationResult = {
  estimatedCost: number;
  currency: 'USD';
  isEstimated: boolean;
  pricingFound: boolean;
  modelUsed: string;
  providerUsed: string;
  inputTokens: number;
  outputTokens: number;
  usageReportedByProvider: boolean;
  qualificationNotice: string;
};

/**
 * Calculates estimated cost based on centralized model pricing.
 * Strictly distinguishes provider-reported token usage from synthetic or fallback estimates.
 * Cost estimates are not invoice-accurate amounts.
 */
export function calculateModelCost(params: {
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  isProviderReported?: boolean;
}): CostCalculationResult {
  const model = params.model || 'mock';
  const provider = params.provider || 'mock';
  const inputTokens = params.inputTokens ?? 0;
  const outputTokens = params.outputTokens ?? 0;
  const usageReportedByProvider = Boolean(params.isProviderReported);

  const pricing = MODEL_PRICING_TABLE[model];

  if (!pricing) {
    return {
      estimatedCost: 0,
      currency: 'USD',
      isEstimated: true,
      pricingFound: false,
      modelUsed: model,
      providerUsed: provider,
      inputTokens,
      outputTokens,
      usageReportedByProvider,
      qualificationNotice: `Pricing metadata unavailable for model "${model}". Reported cost is $0.00 until verified pricing is added.`
    };
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const totalCost = Number((inputCost + outputCost).toFixed(6));

  const qualificationNotice = usageReportedByProvider
    ? `Estimated based on provider-reported token counts (${inputTokens} in / ${outputTokens} out) using official rates as of ${pricing.lastUpdated}. Not an invoice-accurate bill.`
    : `Estimated using synthetic token counts (${inputTokens} in / ${outputTokens} out). Provider did not return exact usage counters.`;

  return {
    estimatedCost: totalCost,
    currency: 'USD',
    isEstimated: true,
    pricingFound: true,
    modelUsed: model,
    providerUsed: provider,
    inputTokens,
    outputTokens,
    usageReportedByProvider,
    qualificationNotice
  };
}
