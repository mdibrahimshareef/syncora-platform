-- Phase 14: Advanced Automation Builder Schema

-- 1. Map old data formats to new formats before altering schemas
-- Add new columns to automations
ALTER TABLE public.automations 
  ADD COLUMN description TEXT,
  ADD COLUMN status TEXT DEFAULT 'DRAFT',
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN conditions JSONB,
  ADD COLUMN actions JSONB;

-- Set default values for existing rows
UPDATE public.automations 
SET 
  status = CASE WHEN is_active THEN 'PUBLISHED' ELSE 'DISABLED' END,
  actions = jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'type', 
    CASE 
      WHEN action_type = 'assign_user' THEN 'task.assign'
      WHEN action_type = 'notify_user' THEN 'notify.user'
      WHEN action_type = 'create_subtask' THEN 'task.create'
      WHEN action_type = 'trigger_webhook' THEN 'webhook.send'
      ELSE action_type
    END, 
  'config', action_config));

-- Drop old constraints before mapping trigger types
ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS automations_trigger_type_check;
ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS automations_action_type_check;

-- Map trigger types
UPDATE public.automations SET trigger_type = 'task.status_changed' WHERE trigger_type = 'on_status_change';
UPDATE public.automations SET trigger_type = 'task.created' WHERE trigger_type = 'on_task_create';
UPDATE public.automations SET trigger_type = 'task.overdue' WHERE trigger_type = 'on_due_date';

-- Apply new constraint for trigger types
ALTER TABLE public.automations 
  ADD CONSTRAINT automations_trigger_type_check 
  CHECK (trigger_type IN ('task.created', 'task.updated', 'task.status_changed', 'task.assigned', 'task.completed', 'task.overdue', 'project.created', 'project.status_changed', 'request.created', 'request.approved'));

-- Apply constraint for status
ALTER TABLE public.automations 
  ADD CONSTRAINT automations_status_check 
  CHECK (status IN ('DRAFT', 'PUBLISHED', 'DISABLED'));

-- Drop old columns
ALTER TABLE public.automations 
  DROP COLUMN action_type,
  DROP COLUMN action_config,
  DROP COLUMN is_active;


-- 2. Upgrade automation_runs table
ALTER TABLE public.automation_runs DROP CONSTRAINT IF EXISTS automation_runs_status_check;

UPDATE public.automation_runs 
SET status = CASE 
  WHEN status = 'Success' THEN 'completed' 
  WHEN status = 'Failed' THEN 'failed' 
  ELSE status 
END;

ALTER TABLE public.automation_runs 
  ADD COLUMN automation_version INTEGER DEFAULT 1,
  ADD COLUMN root_event_id TEXT,
  ADD COLUMN execution_depth INTEGER DEFAULT 1,
  ADD COLUMN entity_type TEXT,
  ADD COLUMN entity_id TEXT,
  ADD COLUMN triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.automation_runs 
  ADD CONSTRAINT automation_runs_status_check 
  CHECK (status IN ('running', 'completed', 'partially_failed', 'failed', 'skipped'));


-- 3. Create Automation Action Logs table
CREATE TABLE public.automation_action_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id UUID REFERENCES public.automation_runs(id) ON DELETE CASCADE NOT NULL,
    automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    action_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Success', 'Failed')),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.automation_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation action logs in their workspaces" ON public.automation_action_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = automation_action_logs.workspace_id
            AND user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX idx_automations_workspace_id ON public.automations(workspace_id);
CREATE INDEX idx_automation_runs_workspace_id ON public.automation_runs(workspace_id);
CREATE INDEX idx_automation_runs_automation_id ON public.automation_runs(automation_id);
CREATE INDEX idx_automation_action_logs_run_id ON public.automation_action_logs(run_id);
