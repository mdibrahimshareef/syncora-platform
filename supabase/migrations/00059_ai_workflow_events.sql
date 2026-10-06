-- Create table for AI Workflows
CREATE TABLE IF NOT EXISTS public.ai_workflows (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    plan JSONB NOT NULL,
    status TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create table for AI Workflow Events
CREATE TABLE IF NOT EXISTS public.ai_workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL REFERENCES public.ai_workflows(id) ON DELETE CASCADE,
    step_id TEXT,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    sequence BIGINT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_workflow_events_workflow_id ON public.ai_workflow_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_events_workspace_id ON public.ai_workflow_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_workspace_id ON public.ai_workflows(workspace_id);

-- Enable RLS
ALTER TABLE public.ai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workflow_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_workflows
CREATE POLICY "Users can view workflows in their workspace"
ON public.ai_workflows
FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own workflows"
ON public.ai_workflows
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workflows"
ON public.ai_workflows
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for ai_workflow_events
CREATE POLICY "Users can view workflow events in their workspace"
ON public.ai_workflow_events
FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own workflow events"
ON public.ai_workflow_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Add to publication for Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_workflow_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_workflows;
