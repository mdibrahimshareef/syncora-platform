import { SupabaseClient } from '@supabase/supabase-js';
import {
  AIMemoryRecord,
  CreateMemoryInput,
  MemoryCategory,
  MemoryScope
} from '@/types/ai-memory';

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
  } = {}
): Promise<AIMemoryRecord[]> {
  const limit = Math.min(options.limit || 20, 50);

  // Expire any outdated memories deterministically
  const nowIso = new Date().toISOString();
  await supabase
    .from('ai_memories')
    .update({ lifecycle_status: 'expired' })
    .eq('workspace_id', workspaceId)
    .eq('lifecycle_status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso);

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
      .limit(limit);

    if (options.categories && options.categories.length > 0) {
      q = q.in('category', options.categories);
    }

    const { data } = await q;
    return (data || []) as AIMemoryRecord[];
  }

  if (options.scope === 'workspace') {
    let q = supabase
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('scope', 'workspace')
      .is('user_id', null)
      .eq('lifecycle_status', 'active')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (options.categories && options.categories.length > 0) {
      q = q.in('category', options.categories);
    }

    const { data } = await q;
    return (data || []) as AIMemoryRecord[];
  }

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
        .limit(limit);
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
            .limit(10);
          if (options.categories && options.categories.length > 0) {
            q = q.in('category', options.categories);
          }
          return q;
        })()
      : Promise.resolve({ data: [] })
  ]);

  const combined = [...(wsRes.data || []), ...(userRes.data || [])];
  return combined as AIMemoryRecord[];
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
