import { SupabaseClient } from '@supabase/supabase-js';
import {
  AIMemoryRecord,
  CreateMemoryInput,
  MemoryCategory,
  MemoryScope
} from '@/types/ai-memory';

export type {
  AIMemoryRecord,
  CreateMemoryInput,
  MemoryCategory,
  MemoryScope
};

export class MemoryAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryAuthorizationError';
  }
}

export class MemoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryValidationError';
  }
}

export interface MemoryRelevanceScore {
  totalScore: number;
  components: {
    queryRelevance: number;
    freshnessScore: number;
    confidenceWeight: number;
    verificationBoost: number;
  };
  isEligible: boolean;
  exclusionReason?: string;
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'what', 'when', 'where', 'which', 'who', 'how', 'can', 'should',
  'please', 'tell', 'show', 'list', 'give', 'me', 'my', 'our', 'we', 'this',
  'about', 'there', 'their', 'them', 'then', 'any', 'all', 'some'
]);

const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  goal_priority: ['goal', 'priority', 'target', 'objective', 'milestone', 'okr', 'aim'],
  project_objective: ['project', 'objective', 'scope', 'deliverable', 'roadmap', 'vision'],
  decision_rationale: ['decision', 'rationale', 'why', 'decided', 'tradeoff', 'choice', 'chose'],
  recurring_blocker: ['blocker', 'blocked', 'stuck', 'impediment', 'issue', 'delay', 'obstacle'],
  historical_outcome: ['outcome', 'result', 'history', 'retrospective', 'learned', 'past', 'previous'],
  working_agreement: ['agreement', 'rule', 'convention', 'standard', 'workflow', 'policy', 'guideline'],
  user_preference: ['preference', 'prefer', 'favorite', 'format', 'style', 'concise', 'detailed', 'detail'],
  milestone_lesson: ['lesson', 'postmortem', 'retrospective', 'learn', 'mistake', 'finding'],
  operational_pattern: ['pattern', 'cadence', 'frequency', 'operation', 'process', 'routine'],
  risk_resolution: ['risk', 'mitigation', 'resolution', 'hazard', 'vulnerability', 'resolved']
};

export function extractMeaningfulTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Deterministically scores the relevance of an active memory record against a query.
 * Combines token overlap, category keywords, continuous exponential freshness decay,
 * verification level, and recorded confidence.
 */
export function scoreMemoryRelevance(
  memory: AIMemoryRecord,
  query: string = '',
  referenceDate: Date = new Date()
): MemoryRelevanceScore {
  // 1. Eligibility Check (Hard Lifecycle Gate)
  if (memory.lifecycle_status !== 'active' || memory.superseded_by) {
    return {
      totalScore: 0,
      components: { queryRelevance: 0, freshnessScore: 0, confidenceWeight: 0, verificationBoost: 0 },
      isEligible: false,
      exclusionReason: 'superseded_or_inactive'
    };
  }

  if (memory.expires_at && new Date(memory.expires_at).getTime() <= referenceDate.getTime()) {
    return {
      totalScore: 0,
      components: { queryRelevance: 0, freshnessScore: 0, confidenceWeight: 0, verificationBoost: 0 },
      isEligible: false,
      exclusionReason: 'expired'
    };
  }

  // 2. Query Relevance
  const queryTokens = extractMeaningfulTokens(query);
  let queryRelevance = 0.5; // neutral baseline if no query provided

  if (queryTokens.length > 0) {
    const memoryText = `${memory.content} ${memory.summary || ''} ${memory.category}`.toLowerCase();
    const memoryTokens = new Set(extractMeaningfulTokens(memoryText));
    
    // Add structured attribute keys and values if present
    if (memory.attributes && typeof memory.attributes === 'object') {
      for (const [k, v] of Object.entries(memory.attributes)) {
        memoryTokens.add(k.toLowerCase());
        if (typeof v === 'string') {
          extractMeaningfulTokens(v).forEach(t => memoryTokens.add(t));
        }
      }
    }

    const matches = queryTokens.filter(t => memoryTokens.has(t));
    const tokenOverlap = matches.length / queryTokens.length;

    // Category keyword matching boost
    const catKeywords = CATEGORY_KEYWORDS[memory.category] || [];
    const hasCategoryMatch = queryTokens.some(t => catKeywords.includes(t));
    const categoryBoost = hasCategoryMatch ? 0.25 : 0;

    queryRelevance = Math.min(1.0, tokenOverlap + categoryBoost);
  }

  // 3. Freshness Score (Continuous exponential decay based on last review/update)
  const targetDateStr = memory.last_reviewed_at || memory.updated_at || memory.created_at;
  const targetTime = targetDateStr ? new Date(targetDateStr).getTime() : referenceDate.getTime();
  const daysDiff = Math.max(0, (referenceDate.getTime() - targetTime) / (1000 * 60 * 60 * 24));
  // Half-life ~45 days (decay factor 0.015). Floor at 0.20 for established long-term knowledge.
  const freshnessScore = Math.max(0.20, Math.exp(-0.015 * daysDiff));

  // 4. Verification Boost
  const verificationMap: Record<string, number> = {
    confirmed: 1.0,
    unverified: 0.8,
    inferred: 0.6,
    disputed: 0.2
  };
  const verificationBoost = verificationMap[memory.verification_status] ?? 0.8;

  // 5. Confidence Weight
  const confidenceWeight = Math.min(1.0, Math.max(0.0, (memory.confidence ?? 80) / 100));

  // 6. Weighted Composite Total Score
  const totalScore = Number((
    (queryRelevance * 0.50) +
    (freshnessScore * 0.25) +
    (verificationBoost * 0.15) +
    (confidenceWeight * 0.10)
  ).toFixed(4));

  return {
    totalScore,
    components: {
      queryRelevance: Number(queryRelevance.toFixed(4)),
      freshnessScore: Number(freshnessScore.toFixed(4)),
      confidenceWeight: Number(confidenceWeight.toFixed(4)),
      verificationBoost: Number(verificationBoost.toFixed(4))
    },
    isEligible: true
  };
}

/**
 * Filters, scores, and ranks candidate memories by relevance and freshness.
 */
export function rankAndFilterMemories(
  memories: AIMemoryRecord[],
  query: string = '',
  options: {
    limit?: number;
    minScoreThreshold?: number;
    referenceDate?: Date;
  } = {}
): Array<AIMemoryRecord & { relevanceScore: MemoryRelevanceScore }> {
  const limit = options.limit || 5;
  const threshold = options.minScoreThreshold ?? (query.trim().length > 0 ? 0.25 : 0.20);
  const refDate = options.referenceDate || new Date();

  const scored = memories.map(mem => ({
    ...mem,
    relevanceScore: scoreMemoryRelevance(mem, query, refDate)
  }));

  const eligible = scored.filter(m => m.relevanceScore.isEligible && m.relevanceScore.totalScore >= threshold);

  eligible.sort((a, b) => b.relevanceScore.totalScore - a.relevanceScore.totalScore);

  return eligible.slice(0, limit);
}

/**
 * Validates a memory record before persistence.
 */
export function validateMemoryInput(input: CreateMemoryInput): void {
  if (!input.workspaceId) {
    throw new MemoryValidationError('workspaceId is required for memory creation');
  }
  if (!input.content || input.content.trim().length === 0) {
    throw new MemoryValidationError('Memory content cannot be empty');
  }
  if (input.content.length > 2000) {
    throw new MemoryValidationError('Memory content exceeds 2000 characters limit');
  }
  if (input.scope === 'user' && !input.userId) {
    throw new MemoryValidationError('userId is required for user-scoped memory');
  }
  if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 100)) {
    throw new MemoryValidationError('Confidence must be between 0 and 100');
  }
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
    throw new MemoryValidationError('expiresAt must be in the future');
  }
}

/**
 * Creates a new organizational memory record.
 * Handles deduplication against existing active memories.
 */
export async function createMemory(
  supabase: SupabaseClient,
  input: CreateMemoryInput,
  creatorId?: string
): Promise<AIMemoryRecord> {
  validateMemoryInput(input);

  const cleanContent = input.content.trim();
  const effectiveUserId = input.scope === 'user' ? input.userId : null;

  // 1. Duplicate check: check if an active memory with exact content and category exists
  let duplicateQuery = supabase
    .from('ai_memories')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('category', input.category)
    .eq('scope', input.scope)
    .eq('lifecycle_status', 'active')
    .eq('content', cleanContent);

  if (effectiveUserId) {
    duplicateQuery = duplicateQuery.eq('user_id', effectiveUserId);
  } else {
    duplicateQuery = duplicateQuery.is('user_id', null);
  }

  const { data: existingDuplicate } = await duplicateQuery.maybeSingle();

  if (existingDuplicate) {
    // If exact duplicate already active, bump last_reviewed_at rather than creating a duplicate
    const { data: updated } = await supabase
      .from('ai_memories')
      .update({
        last_reviewed_at: new Date().toISOString(),
        confidence: Math.max(existingDuplicate.confidence || 80, input.confidence || 80)
      })
      .eq('id', existingDuplicate.id)
      .select()
      .single();

    return (updated || existingDuplicate) as AIMemoryRecord;
  }

  // 2. Insert new memory
  const memoryInsert = {
    workspace_id: input.workspaceId,
    user_id: effectiveUserId,
    scope: input.scope,
    category: input.category,
    content: cleanContent,
    summary: input.summary || null,
    attributes: input.attributes || {},
    source_type: input.sourceType,
    source_entity_type: input.sourceEntityType || null,
    source_entity_id: input.sourceEntityId || null,
    evidence: input.evidence || [],
    confidence: input.confidence ?? 85,
    verification_status: input.verificationStatus ?? 'unverified',
    lifecycle_status: 'active',
    created_by: creatorId || effectiveUserId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
    expires_at: input.expiresAt || null,
    provenance: input.provenance || {}
  };

  const { data, error } = await supabase
    .from('ai_memories')
    .insert(memoryInsert)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist memory: ${error?.message || 'Unknown database error'}`);
  }

  return data as AIMemoryRecord;
}

/**
 * Retrieves active memories scoped to workspace and optionally user.
 * Guarantees that private user memories are never leaked across users.
 */
export async function getScopedMemories(
  supabase: SupabaseClient,
  workspaceId: string,
  options: {
    userId?: string;
    categories?: MemoryCategory[];
    scope?: MemoryScope;
    limit?: number;
    query?: string;
    minScoreThreshold?: number;
    referenceDate?: Date;
  } = {}
): Promise<AIMemoryRecord[]> {
  const limit = Math.min(options.limit || 20, 50);
  const candidateLimit = options.query ? Math.max(limit * 3, 25) : limit;

  // Expire any outdated memories deterministically
  const nowIso = (options.referenceDate || new Date()).toISOString();
  await supabase
    .from('ai_memories')
    .update({ lifecycle_status: 'expired' })
    .eq('workspace_id', workspaceId)
    .eq('lifecycle_status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso);

  let rawCandidates: AIMemoryRecord[] = [];

  // If specific scope requested
  if (options.scope === 'user') {
    if (!options.userId) return [];
    let q = supabase
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('scope', 'user')
      .eq('user_id', options.userId)
      .eq('lifecycle_status', 'active')
      .order('updated_at', { ascending: false })
      .limit(candidateLimit);

    if (options.categories && options.categories.length > 0) {
      q = q.in('category', options.categories);
    }

    const { data } = await q;
    rawCandidates = (data || []) as AIMemoryRecord[];
  } else if (options.scope === 'workspace') {
    let q = supabase
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('scope', 'workspace')
      .is('user_id', null)
      .eq('lifecycle_status', 'active')
      .order('updated_at', { ascending: false })
      .limit(candidateLimit);

    if (options.categories && options.categories.length > 0) {
      q = q.in('category', options.categories);
    }

    const { data } = await q;
    rawCandidates = (data || []) as AIMemoryRecord[];
  } else {
    // Mixed scope: workspace memories + caller's user memories
    const [wsRes, userRes] = await Promise.all([
      (() => {
        let q = supabase
          .from('ai_memories')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('scope', 'workspace')
          .is('user_id', null)
          .eq('lifecycle_status', 'active')
          .order('updated_at', { ascending: false })
          .limit(candidateLimit);
        if (options.categories && options.categories.length > 0) {
          q = q.in('category', options.categories);
        }
        return q;
      })(),
      options.userId
        ? (() => {
            let q = supabase
              .from('ai_memories')
              .select('*')
              .eq('workspace_id', workspaceId)
              .eq('scope', 'user')
              .eq('user_id', options.userId)
              .eq('lifecycle_status', 'active')
              .order('updated_at', { ascending: false })
              .limit(Math.min(candidateLimit, 15));
            if (options.categories && options.categories.length > 0) {
              q = q.in('category', options.categories);
            }
            return q;
          })()
        : Promise.resolve({ data: [] })
    ]);

    rawCandidates = [...(wsRes.data || []), ...(userRes.data || [])] as AIMemoryRecord[];
  }

  // Deduplicate by memory id
  const seenIds = new Set<string>();
  const uniqueCandidates = rawCandidates.filter(m => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  if (options.query) {
    const ranked = rankAndFilterMemories(uniqueCandidates, options.query, {
      limit,
      minScoreThreshold: options.minScoreThreshold,
      referenceDate: options.referenceDate
    });
    return ranked;
  }

  return uniqueCandidates.slice(0, limit);
}

/**
 * Supersedes an existing memory when contradictory or updated information arrives.
 * Preserves audit history by marking the previous memory as 'superseded' with a pointer.
 */
export async function supersedeMemory(
  supabase: SupabaseClient,
  workspaceId: string,
  oldMemoryId: string,
  newMemoryInput: CreateMemoryInput,
  creatorId?: string
): Promise<{ old: AIMemoryRecord; new: AIMemoryRecord }> {
  // 1. Fetch old memory
  const { data: oldMemory, error: fetchError } = await supabase
    .from('ai_memories')
    .select('*')
    .eq('id', oldMemoryId)
    .eq('workspace_id', workspaceId)
    .single();

  if (fetchError || !oldMemory) {
    throw new Error(`Target memory ${oldMemoryId} not found in workspace ${workspaceId}`);
  }

  // 2. Create the replacement memory
  const newMemory = await createMemory(
    supabase,
    {
      ...newMemoryInput,
      provenance: {
        ...(newMemoryInput.provenance || {}),
        supersededMemoryId: oldMemoryId
      }
    },
    creatorId
  );

  // 3. Mark old memory as superseded
  const { data: updatedOld, error: updateError } = await supabase
    .from('ai_memories')
    .update({
      lifecycle_status: 'superseded',
      superseded_by: newMemory.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', oldMemoryId)
    .select()
    .single();

  if (updateError || !updatedOld) {
    throw new Error(`Failed to update superseded memory status: ${updateError?.message}`);
  }

  return {
    old: updatedOld as AIMemoryRecord,
    new: newMemory
  };
}

/**
 * Archives a memory record.
 */
export async function archiveMemory(
  supabase: SupabaseClient,
  workspaceId: string,
  memoryId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_memories')
    .update({
      lifecycle_status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('id', memoryId)
    .eq('workspace_id', workspaceId);

  return !error;
}

/**
 * Deletes a memory record.
 */
export async function deleteMemory(
  supabase: SupabaseClient,
  workspaceId: string,
  memoryId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_memories')
    .delete()
    .eq('id', memoryId)
    .eq('workspace_id', workspaceId);

  return !error;
}
