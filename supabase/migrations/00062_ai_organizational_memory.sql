-- Migration 00062: Organizational Memory & Decision Outcomes (Release 4.6)

-- 1. Create ai_memories table
CREATE TABLE IF NOT EXISTS public.ai_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for workspace-wide shared memory, populated for private user memory
    scope TEXT NOT NULL CHECK (scope IN ('workspace', 'user')),
    
    category TEXT NOT NULL CHECK (category IN (
        'goal_priority',
        'project_objective',
        'decision_rationale',
        'recurring_blocker',
        'historical_outcome',
        'working_agreement',
        'user_preference',
        'milestone_lesson',
        'operational_pattern',
        'risk_resolution'
    )),
    
    content TEXT NOT NULL,
    summary TEXT,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- Key-value attributes, tags, affected entity IDs
    
    source_type TEXT NOT NULL CHECK (source_type IN (
        'explicit_user',
        'decision_record',
        'workflow_outcome',
        'conversation_extraction',
        'meeting_notes',
        'system_observation'
    )),
    source_entity_type TEXT, -- e.g. 'task', 'project', 'goal', 'ai_conversation'
    source_entity_id TEXT,
    evidence JSONB DEFAULT '[]'::jsonb, -- Array of evidence references, quotes, citations
    
    confidence INTEGER NOT NULL DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN (
        'unverified',
        'confirmed',
        'inferred',
        'disputed'
    )),
    
    lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN (
        'active',
        'superseded',
        'archived',
        'expired'
    )),
    superseded_by UUID REFERENCES public.ai_memories(id) ON DELETE SET NULL,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb -- Audit metadata, extraction rationale, original prompt/event
);

-- Indexes for efficient scoping, lifecycle filtering, and category lookups
CREATE INDEX IF NOT EXISTS idx_ai_memories_workspace_scope 
ON public.ai_memories(workspace_id, scope, lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_ai_memories_user_scope 
ON public.ai_memories(workspace_id, user_id, scope, lifecycle_status) 
WHERE scope = 'user';

CREATE INDEX IF NOT EXISTS idx_ai_memories_category 
ON public.ai_memories(workspace_id, category) 
WHERE lifecycle_status = 'active';

CREATE INDEX IF NOT EXISTS idx_ai_memories_source 
ON public.ai_memories(workspace_id, source_entity_type, source_entity_id);

-- 2. Create ai_decision_outcomes table (Phase 8: Outcome & Feedback Loop)
CREATE TABLE IF NOT EXISTS public.ai_decision_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL, -- e.g. 'task_reassignment', 'deadline_adjustment', 'scope_reduction', 'risk_mitigation'
    
    decision_context JSONB NOT NULL, -- Situation summary, constraints, options presented, selected recommendation
    user_action TEXT NOT NULL CHECK (user_action IN ('accepted', 'rejected', 'modified', 'ignored')),
    rejection_reason TEXT,
    modification_details JSONB,
    
    workflow_id TEXT REFERENCES public.ai_workflows(id) ON DELETE SET NULL,
    action_result TEXT NOT NULL DEFAULT 'pending' CHECK (action_result IN (
        'pending',
        'executed_verified',
        'executed_unverified',
        'failed',
        'skipped'
    )),
    
    observed_outcome TEXT NOT NULL DEFAULT 'pending_observation' CHECK (observed_outcome IN (
        'positive',
        'negative',
        'neutral',
        'pending_observation'
    )),
    outcome_notes TEXT,
    feedback_score INTEGER CHECK (feedback_score >= -1 AND feedback_score <= 1), -- -1 negative, 0 neutral, 1 positive
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_decision_outcomes_workspace 
ON public.ai_decision_outcomes(workspace_id, recommendation_type);

CREATE INDEX IF NOT EXISTS idx_ai_decision_outcomes_recommendation 
ON public.ai_decision_outcomes(workspace_id, recommendation_id);

-- 3. Enable RLS
ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decision_outcomes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for ai_memories

-- SELECT: Workspace memory is visible to all workspace members.
-- User memory is ONLY visible to the user who owns it within that workspace.
DROP POLICY IF EXISTS "Workspace members can view active workspace memories" ON public.ai_memories;
CREATE POLICY "Workspace members can view active workspace memories"
ON public.ai_memories
FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND (
        (scope = 'workspace' AND user_id IS NULL)
        OR
        (scope = 'user' AND user_id = auth.uid())
    )
);

-- INSERT: Authenticated workspace members can insert memories for their workspace.
-- User memories must have user_id = auth.uid().
DROP POLICY IF EXISTS "Workspace members can insert scoped memories" ON public.ai_memories;
CREATE POLICY "Workspace members can insert scoped memories"
ON public.ai_memories
FOR INSERT
TO authenticated
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND (
        (scope = 'workspace' AND user_id IS NULL)
        OR
        (scope = 'user' AND user_id = auth.uid())
    )
);

-- UPDATE: User memories can only be updated by the owner.
-- Workspace memories can be updated by workspace members.
DROP POLICY IF EXISTS "Authorized users can update scoped memories" ON public.ai_memories;
CREATE POLICY "Authorized users can update scoped memories"
ON public.ai_memories
FOR UPDATE
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND (
        (scope = 'workspace' AND user_id IS NULL)
        OR
        (scope = 'user' AND user_id = auth.uid())
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND (
        (scope = 'workspace' AND user_id IS NULL)
        OR
        (scope = 'user' AND user_id = auth.uid())
    )
);

-- DELETE: User memories can be deleted by owner.
-- Workspace memories can only be deleted by workspace owners/admins.
DROP POLICY IF EXISTS "Authorized users can delete memories" ON public.ai_memories;
CREATE POLICY "Authorized users can delete memories"
ON public.ai_memories
FOR DELETE
TO authenticated
USING (
    (scope = 'user' AND user_id = auth.uid())
    OR
    (
        scope = 'workspace' AND workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
);

-- 5. RLS Policies for ai_decision_outcomes

DROP POLICY IF EXISTS "Workspace members can view decision outcomes" ON public.ai_decision_outcomes;
CREATE POLICY "Workspace members can view decision outcomes"
ON public.ai_decision_outcomes
FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Authenticated users can record their decision outcomes" ON public.ai_decision_outcomes;
CREATE POLICY "Authenticated users can record their decision outcomes"
ON public.ai_decision_outcomes
FOR INSERT
TO authenticated
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated users can update their decision outcomes" ON public.ai_decision_outcomes;
CREATE POLICY "Authenticated users can update their decision outcomes"
ON public.ai_decision_outcomes
FOR UPDATE
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND (
        user_id = auth.uid()
        OR
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
);

-- 6. Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_decision_outcomes;
