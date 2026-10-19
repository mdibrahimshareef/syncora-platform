import { SupabaseClient } from '@supabase/supabase-js';
import { MemoryCategory } from '@/types/ai-memory';
import { logAITelemetry, createTraceContext } from './telemetry';

export type ResponseDetailLevel = 'concise' | 'balanced' | 'comprehensive';

export interface UserAIPreferences {
  detailLevel: ResponseDetailLevel;
  enablePersonalization: boolean;
  enableOutcomeRanking: boolean;
  preferredCategories: MemoryCategory[];
  excludedMemoryIds: string[];
  updatedAt?: string;
}

export const DEFAULT_AI_PREFERENCES: UserAIPreferences = {
  detailLevel: 'balanced',
  enablePersonalization: true,
  enableOutcomeRanking: true,
  preferredCategories: [
    'goal_priority',
    'working_agreement',
    'decision_rationale',
    'recurring_blocker'
  ],
  excludedMemoryIds: []
};

/**
 * Validates preference inputs to ensure strict bounds and valid types.
 */
export function validatePreferencesInput(input: Partial<UserAIPreferences>): Partial<UserAIPreferences> {
  const validated: Partial<UserAIPreferences> = {};

  if (input.detailLevel !== undefined) {
    if (!['concise', 'balanced', 'comprehensive'].includes(input.detailLevel)) {
      throw new Error(`Invalid detailLevel: ${input.detailLevel}. Allowed: concise, balanced, comprehensive.`);
    }
    validated.detailLevel = input.detailLevel;
  }

  if (input.enablePersonalization !== undefined) {
    validated.enablePersonalization = Boolean(input.enablePersonalization);
  }

  if (input.enableOutcomeRanking !== undefined) {
    validated.enableOutcomeRanking = Boolean(input.enableOutcomeRanking);
  }

  if (input.preferredCategories !== undefined) {
    if (!Array.isArray(input.preferredCategories)) {
      throw new Error('preferredCategories must be an array of MemoryCategory.');
    }
    validated.preferredCategories = input.preferredCategories.slice(0, 10);
  }

  if (input.excludedMemoryIds !== undefined) {
    if (!Array.isArray(input.excludedMemoryIds)) {
      throw new Error('excludedMemoryIds must be an array of strings.');
    }
    validated.excludedMemoryIds = input.excludedMemoryIds.slice(0, 100);
  }

  return validated;
}

/**
 * Retrieves a user's scoped AI preferences from organizational memory.
 * Falls back safely to default preferences if record does not exist or fails.
 */
export async function getUserAIPreferences(
  supabase: SupabaseClient,
  workspaceId: string,
  userId?: string
): Promise<UserAIPreferences> {
  if (!userId || !workspaceId) {
    return { ...DEFAULT_AI_PREFERENCES };
  }

  try {
    const { data, error } = await supabase
      .from('ai_memories')
      .select('attributes, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('scope', 'user')
      .eq('category', 'user_preference')
      .eq('lifecycle_status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !data.attributes) {
      return { ...DEFAULT_AI_PREFERENCES };
    }

    const attrs = (data.attributes && typeof data.attributes === 'object') ? (data.attributes as Record<string, unknown>) : {};
    return {
      detailLevel: (attrs.detailLevel as UserAIPreferences['detailLevel']) || DEFAULT_AI_PREFERENCES.detailLevel,
      enablePersonalization: typeof attrs.enablePersonalization === 'boolean' ? attrs.enablePersonalization : DEFAULT_AI_PREFERENCES.enablePersonalization,
      enableOutcomeRanking: typeof attrs.enableOutcomeRanking === 'boolean' ? attrs.enableOutcomeRanking : DEFAULT_AI_PREFERENCES.enableOutcomeRanking,
      preferredCategories: Array.isArray(attrs.preferredCategories) ? attrs.preferredCategories as UserAIPreferences['preferredCategories'] : DEFAULT_AI_PREFERENCES.preferredCategories,
      excludedMemoryIds: Array.isArray(attrs.excludedMemoryIds) ? attrs.excludedMemoryIds as string[] : DEFAULT_AI_PREFERENCES.excludedMemoryIds,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('Error fetching user AI preferences, falling back to defaults:', err);
    return { ...DEFAULT_AI_PREFERENCES };
  }
}

/**
 * Persists or updates a user's scoped AI preferences in organizational memory.
 * Preserves strict user-level scoping and authorization.
 */
export async function updateUserAIPreferences(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  updates: Partial<UserAIPreferences>
): Promise<UserAIPreferences> {
  if (!workspaceId || !userId) {
    throw new Error('workspaceId and userId are required to persist user preferences.');
  }

  const validatedUpdates = validatePreferencesInput(updates);
  const current = await getUserAIPreferences(supabase, workspaceId, userId);

  const merged: UserAIPreferences = {
    ...current,
    ...validatedUpdates,
    updatedAt: new Date().toISOString()
  };

  const cleanContent = `User AI Preferences: Detail=${merged.detailLevel}, Personalization=${merged.enablePersonalization ? 'Enabled' : 'Disabled'}, OutcomeRanking=${merged.enableOutcomeRanking ? 'Enabled' : 'Disabled'}`;

  // Check if active preference record exists
  const { data: existing } = await supabase
    .from('ai_memories')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('scope', 'user')
    .eq('category', 'user_preference')
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from('ai_memories')
      .update({
        content: cleanContent,
        attributes: merged,
        updated_at: merged.updatedAt,
        last_reviewed_at: merged.updatedAt
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update AI preferences: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase
      .from('ai_memories')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        scope: 'user',
        category: 'user_preference',
        content: cleanContent,
        attributes: merged,
        source_type: 'explicit_user',
        confidence: 100,
        verification_status: 'confirmed',
        lifecycle_status: 'active',
        created_at: merged.updatedAt,
        updated_at: merged.updatedAt,
        last_reviewed_at: merged.updatedAt
      });

    if (insertError) {
      throw new Error(`Failed to insert AI preferences: ${insertError.message}`);
    }
  }

  const traceCtx = createTraceContext({ workspaceId });
  logAITelemetry({
    requestId: traceCtx.requestId || crypto.randomUUID(),
    traceId: traceCtx.traceId,
    workspaceId,
    userId,
    model: 'preferences-service',
    latencyMs: 0,
    toolCallsCount: 0,
    success: true
  });

  return merged;
}

/**
 * Resets user preferences back to default product behavior.
 */
export async function resetUserAIPreferences(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<UserAIPreferences> {
  const { error } = await supabase
    .from('ai_memories')
    .update({
      lifecycle_status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('scope', 'user')
    .eq('category', 'user_preference')
    .eq('lifecycle_status', 'active');

  if (error) {
    console.error('Failed to reset AI preferences memory record:', error);
  }

  return { ...DEFAULT_AI_PREFERENCES };
}

export interface EffectivePreferenceResolution {
  effectivePreferences: UserAIPreferences;
  precedenceApplied: {
    explicitQueryOverride: boolean;
    personalizationDisabled: boolean;
    appliedDetailLevel: ResponseDetailLevel;
    rationale: string;
  };
}

/**
 * Resolves effective preferences by strictly enforcing the precedence hierarchy:
 * 1. Hard Authorization & Safety (cannot be weakened)
 * 2. Authoritative Current Evidence (facts cannot be modified by preference)
 * 3. Explicit Current Request Intent (query intent overrides saved preference)
 * 4. Explicit Saved Preferences (from user settings)
 * 5. Default Product Behavior (fallback when personalization is disabled or unset)
 */
export function resolveEffectivePreferences(
  savedPreferences: UserAIPreferences,
  query: string = ''
): EffectivePreferenceResolution {
  const q = query.toLowerCase();

  // 1. Check if user explicitly disabled personalization
  if (!savedPreferences.enablePersonalization) {
    // If personalization is disabled, outcome ranking and memory personalization are turned off.
    // However, if the current request itself explicitly says "briefly" or "in detail", honor that prompt directive.
    let promptDetailLevel: ResponseDetailLevel = 'balanced';
    let explicitOverride = false;

    if (/\b(brief|briefly|short|concise|quick|summary only|1 sentence|tldr)\b/.test(q)) {
      promptDetailLevel = 'concise';
      explicitOverride = true;
    } else if (/\b(comprehensive|detailed|in-depth|exhaustive|deep dive|full breakdown)\b/.test(q)) {
      promptDetailLevel = 'comprehensive';
      explicitOverride = true;
    }

    return {
      effectivePreferences: {
        ...DEFAULT_AI_PREFERENCES,
        enablePersonalization: false,
        enableOutcomeRanking: false,
        detailLevel: promptDetailLevel,
        excludedMemoryIds: savedPreferences.excludedMemoryIds || []
      },
      precedenceApplied: {
        explicitQueryOverride: explicitOverride,
        personalizationDisabled: true,
        appliedDetailLevel: promptDetailLevel,
        rationale: explicitOverride 
          ? `Personalization is disabled by user. Prompt-level instruction "${promptDetailLevel}" applied for current query.`
          : 'Personalization is disabled by user. Standard non-personalized defaults applied.'
      }
    };
  }

  // 2. Check for explicit prompt intent override
  let effectiveDetailLevel = savedPreferences.detailLevel || 'balanced';
  let explicitQueryOverride = false;
  let rationale = `Using saved preference detail level: "${effectiveDetailLevel}".`;

  if (/\b(brief|briefly|short|concise|quick|summary only|1 sentence|tldr)\b/.test(q)) {
    effectiveDetailLevel = 'concise';
    explicitQueryOverride = true;
    rationale = `Explicit query intent for brevity overrides saved preference "${savedPreferences.detailLevel}".`;
  } else if (/\b(comprehensive|detailed|in-depth|exhaustive|deep dive|full breakdown)\b/.test(q)) {
    effectiveDetailLevel = 'comprehensive';
    explicitQueryOverride = true;
    rationale = `Explicit query intent for comprehensive analysis overrides saved preference "${savedPreferences.detailLevel}".`;
  }

  return {
    effectivePreferences: {
      ...savedPreferences,
      detailLevel: effectiveDetailLevel
    },
    precedenceApplied: {
      explicitQueryOverride,
      personalizationDisabled: false,
      appliedDetailLevel: effectiveDetailLevel,
      rationale
    }
  };
}
