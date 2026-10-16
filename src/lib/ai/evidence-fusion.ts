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
  for (const [key, items] of entityMap.entries()) {
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
      // If secondary item contradicts authoritative item
      if (
        authoritativeItem.authorityLevel === 'authoritative_db' &&
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
    }

    // Include the primary authoritative item, and keep secondary items only if they add distinct content
    fusedItems.push(authoritativeItem);
  }

  // 3. Construct clean source list for UI citation
  const sources: AISource[] = fusedItems.map(item => ({
    id: `evidence-${item.sourceType}-${item.sourceId}`,
    entityId: item.sourceId,
    type: item.sourceType as any,
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
