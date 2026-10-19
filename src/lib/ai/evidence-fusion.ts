import { AISource } from './sources';

export type EvidenceAuthorityLevel =
  | 'authoritative_db'     // Level 1: Current verified database state (tasks, projects, milestones)
  | 'organizational_memory'// Level 2: Confirmed decisions, working agreements, verified memory records
  | 'semantic_document'    // Level 3: Unstructured wikis, docs, knowledge base matches
  | 'inferred_summary';    // Level 4: Model or analytical inferences

export interface FusedEvidenceItem {
  id: string;
  sourceType: 'task' | 'project' | 'milestone' | 'goal' | 'memory' | 'document' | 'time_entry' | 'analysis';
  sourceId: string;
  workspaceId: string;
  title: string;
  content: string;
  authorityLevel: EvidenceAuthorityLevel;
  retrievalMethod: 'sql' | 'semantic' | 'relationship' | 'temporal' | 'memory';
  timestamp?: string;
  url?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  isStale?: boolean;
}

export interface EvidenceConflict {
  entityType: string;
  entityId: string;
  authoritativeClaim: string;
  contradictoryClaim: string;
  resolvedInFavorOf: 'authoritative_db';
  explanation: string;
}

export interface FusedEvidenceReport {
  items: FusedEvidenceItem[];
  conflicts: EvidenceConflict[];
  sources: AISource[];
  summaryContext: string;
}

/**
 * Authority hierarchy comparator:
 * authoritative_db (1) > organizational_memory (2) > semantic_document (3) > inferred_summary (4)
 */
const AUTHORITY_RANK: Record<EvidenceAuthorityLevel, number> = {
  authoritative_db: 1,
  organizational_memory: 2,
  semantic_document: 3,
  inferred_summary: 4
};

/**
 * Fuses multi-source evidence into a deduplicated, authority-ranked evidence set.
 * Enforces: Authoritative structured records take precedence over stale memory or semantic summaries.
 */
export function fuseEvidence(rawItems: FusedEvidenceItem[]): FusedEvidenceReport {
  const entityMap = new Map<string, FusedEvidenceItem[]>();
  const conflicts: EvidenceConflict[] = [];

  // 1. Group by entity (sourceType:sourceId)
  for (const item of rawItems) {
    const key = `${item.sourceType}:${item.sourceId}`;
    const group = entityMap.get(key) || [];
    group.push(item);
    entityMap.set(key, group);
  }

  const fusedItems: FusedEvidenceItem[] = [];

  // 2. Resolve conflicts and deduplicate per entity
  for (const [, items] of entityMap.entries()) {
    if (items.length === 1) {
      fusedItems.push(items[0]);
      continue;
    }

    // Sort by authority (lowest rank number = highest authority)
    items.sort((a, b) => AUTHORITY_RANK[a.authorityLevel] - AUTHORITY_RANK[b.authorityLevel]);
    const authoritativeItem = items[0];

    // Check for conflicts between authoritative DB and other items
    for (let i = 1; i < items.length; i++) {
      const secondaryItem = items[i];
      if (authoritativeItem.authorityLevel === 'authoritative_db') {
        // Status conflict check
        if (
          secondaryItem.metadata?.status &&
          authoritativeItem.metadata?.status &&
          secondaryItem.metadata.status !== authoritativeItem.metadata.status
        ) {
          secondaryItem.isStale = true;
          conflicts.push({
            entityType: authoritativeItem.sourceType,
            entityId: authoritativeItem.sourceId,
            authoritativeClaim: `Current verified state: ${authoritativeItem.metadata.status}`,
            contradictoryClaim: `Historical/document reference: ${secondaryItem.metadata.status}`,
            resolvedInFavorOf: 'authoritative_db',
            explanation: `The current verified database state (${authoritativeItem.metadata.status}) overrides the older reference.`
          });
        }

        // Due date conflict check
        if (
          secondaryItem.metadata?.due_date &&
          authoritativeItem.metadata?.due_date &&
          secondaryItem.metadata.due_date !== authoritativeItem.metadata.due_date
        ) {
          secondaryItem.isStale = true;
          conflicts.push({
            entityType: authoritativeItem.sourceType,
            entityId: authoritativeItem.sourceId,
            authoritativeClaim: `Current due date: ${authoritativeItem.metadata.due_date}`,
            contradictoryClaim: `Secondary due date: ${secondaryItem.metadata.due_date}`,
            resolvedInFavorOf: 'authoritative_db',
            explanation: `Authoritative task schedule overrides secondary reference.`
          });
        }
      }
    }

    // Include the primary authoritative item, and keep secondary items only if they add distinct content
    fusedItems.push(authoritativeItem);
  }

  // 3. Construct clean source list for UI citation
  const sources: AISource[] = fusedItems.map(item => ({
    id: `evidence-${item.sourceType}-${item.sourceId}`,
    entityId: item.sourceId,
    type: (item.sourceType === 'analysis' ? 'activity' : item.sourceType) as AISource['type'],
    title: item.title,
    description: item.content.slice(0, 200),
    workspaceId: item.workspaceId,
    sourceKind: item.retrievalMethod === 'sql' ? 'tool' : 'analysis',
    confidence: item.confidence,
    url: item.url
  }));

  // 4. Build synthesized context text for LLM prompt injection
  const summaryContext = fusedItems
    .map(i => {
      const staleTag = i.isStale ? ' [HISTORICAL / SUPERSEDED]' : '';
      return `[Source: ${i.sourceType.toUpperCase()} #${i.sourceId} (${i.authorityLevel}${staleTag})]: ${i.title} - ${i.content}`;
    })
    .join('\n');

  return {
    items: fusedItems,
    conflicts,
    sources,
    summaryContext
  };
}

export interface EvidenceValidationResult {
  isValid: boolean;
  groundingScore: number;
  supportedClaims: string[];
  unsupportedClaims: string[];
  contradictions: EvidenceConflict[];
  missingEntities: Array<{ type: string; id: string }>;
  shouldAbstain: boolean;
  abstentionReason: string | null;
}

/**
 * Validates a recommendation against verified workspace evidence.
 * Verifies that referenced entities exist in authorized context and do not
 * contradict current authoritative database records.
 */
export function validateRecommendationEvidence(
  recommendation: {
    claim: string;
    referencedEntities?: Array<{ type: string; id: string; expectedStatus?: string; expectedDueDate?: string }>;
    supportingEvidenceIds?: string[];
  },
  evidenceReport: FusedEvidenceReport
): EvidenceValidationResult {
  const supportedClaims: string[] = [];
  const unsupportedClaims: string[] = [];
  const missingEntities: Array<{ type: string; id: string }> = [];
  const contradictions: EvidenceConflict[] = [];

  const entityMap = new Map<string, FusedEvidenceItem>();
  for (const item of evidenceReport.items) {
    entityMap.set(`${item.sourceType}:${item.sourceId}`, item);
  }

  const referenced = recommendation.referencedEntities || [];

  for (const ref of referenced) {
    const key = `${ref.type}:${ref.id}`;
    const evidenceItem = entityMap.get(key);

    if (!evidenceItem) {
      missingEntities.push({ type: ref.type, id: ref.id });
      unsupportedClaims.push(`Referenced ${ref.type} #${ref.id} does not exist in authorized workspace context.`);
      continue;
    }

    // Check if there are known conflicts for this entity
    const entityConflict = evidenceReport.conflicts.find(c => c.entityType === ref.type && c.entityId === ref.id);
    if (entityConflict) {
      contradictions.push(entityConflict);
    }

    // Check status alignment if expected status is stated
    if (ref.expectedStatus && evidenceItem.metadata?.status) {
      if (String(ref.expectedStatus).toLowerCase() !== String(evidenceItem.metadata.status).toLowerCase()) {
        const conflict: EvidenceConflict = {
          entityType: ref.type,
          entityId: ref.id,
          authoritativeClaim: `Authoritative status is "${evidenceItem.metadata.status}"`,
          contradictoryClaim: `Recommendation assumed status was "${ref.expectedStatus}"`,
          resolvedInFavorOf: 'authoritative_db',
          explanation: `Recommendation contradicts verified database status (${evidenceItem.metadata.status}).`
        };
        contradictions.push(conflict);
        unsupportedClaims.push(`Claim assumes ${ref.type} #${ref.id} is ${ref.expectedStatus}, but verified DB state is ${evidenceItem.metadata.status}.`);
        continue;
      }
    }

    supportedClaims.push(`Verified ${ref.type} #${ref.id} (${evidenceItem.title}) via ${evidenceItem.authorityLevel}.`);
  }

  const totalEvaluated = (supportedClaims.length + unsupportedClaims.length) || 1;
  const groundingScore = Number((supportedClaims.length / totalEvaluated).toFixed(4));
  const shouldAbstain = contradictions.length > 0 || (referenced.length > 0 && supportedClaims.length === 0);
  const abstentionReason = contradictions.length > 0
    ? `Recommendation contradicts verified database evidence for ${contradictions.map(c => `${c.entityType} #${c.entityId}`).join(', ')}.`
    : (referenced.length > 0 && supportedClaims.length === 0
        ? `Insufficient verified evidence in workspace to support recommendation.`
        : null);

  return {
    isValid: !shouldAbstain && groundingScore >= 0.5,
    groundingScore,
    supportedClaims,
    unsupportedClaims,
    contradictions,
    missingEntities,
    shouldAbstain,
    abstentionReason
  };
}

/**
 * Formats an evidence-grounded recommendation explanation using the executive template.
 */
export function formatGroundedExplanation(params: {
  recommendation: string;
  whyThisMatters: string;
  evidence: string[];
  uncertaintiesOrAssumptions?: string[];
  suggestedNextSteps?: string[];
  validation?: EvidenceValidationResult;
}): string {
  const sections: string[] = [];

  sections.push(`### Recommendation\n${params.recommendation}`);
  sections.push(`**Why this matters:**\n${params.whyThisMatters}`);

  if (params.evidence && params.evidence.length > 0) {
    sections.push(`**Evidence:**\n${params.evidence.map(e => `- ${e}`).join('\n')}`);
  }

  const uncertainties = [...(params.uncertaintiesOrAssumptions || [])];
  if (params.validation?.contradictions && params.validation.contradictions.length > 0) {
    uncertainties.push(...params.validation.contradictions.map(c => `Contradiction: ${c.explanation}`));
  }
  if (params.validation?.missingEntities && params.validation.missingEntities.length > 0) {
    uncertainties.push(...params.validation.missingEntities.map(m => `Missing source record: ${m.type} #${m.id}`));
  }
  if (uncertainties.length > 0) {
    sections.push(`**Uncertainty & Assumptions:**\n${uncertainties.map(u => `- ${u}`).join('\n')}`);
  }

  if (params.suggestedNextSteps && params.suggestedNextSteps.length > 0) {
    sections.push(`---\n**Suggested Next Steps:**\n${params.suggestedNextSteps.map((s, idx) => `${idx + 1}. **${s}**`).join('\n')}`);
  }

  return sections.join('\n\n');
}
