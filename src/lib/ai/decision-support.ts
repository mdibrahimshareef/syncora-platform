import { AISource } from './sources';

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  expectedBenefits: string[];
  risksAndTradeOffs: string[];
  affectedDependencies?: string[];
  requiredHumanApprovals: string[];
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

export interface StructuredDecisionSupport {
  decisionId: string;
  situationSummary: string;
  verifiedEvidence: string[];
  mainConstraints: string[];
  options: DecisionOption[];
  recommendedOptionId: string;
  recommendationRationale: string;
  uncertaintyNotes?: string;
  sources: AISource[];
  proposedActionOrWorkflow?: {
    type: 'single_action' | 'workflow_plan';
    tool: string;
    args: Record<string, unknown>;
  };
}

/**
 * Builds a structured, explainable decision comparison.
 * Ensures recommendations are grounded in verified evidence with explicit trade-offs.
 */
export function buildDecisionComparison(
  situationSummary: string,
  verifiedEvidence: string[],
  mainConstraints: string[],
  options: DecisionOption[],
  recommendedOptionId: string,
  recommendationRationale: string,
  sources: AISource[] = [],
  uncertaintyNotes?: string,
  proposedActionOrWorkflow?: StructuredDecisionSupport['proposedActionOrWorkflow']
): StructuredDecisionSupport {
  const recommended = options.find(o => o.id === recommendedOptionId);
  if (!recommended) {
    throw new Error(`Recommended option "${recommendedOptionId}" not found in available options.`);
  }

  return {
    decisionId: crypto.randomUUID(),
    situationSummary,
    verifiedEvidence,
    mainConstraints,
    options,
    recommendedOptionId,
    recommendationRationale,
    uncertaintyNotes,
    sources,
    proposedActionOrWorkflow
  };
}
