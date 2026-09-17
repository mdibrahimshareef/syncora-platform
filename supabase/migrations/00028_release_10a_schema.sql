-- ------------------------------------------------------------------------------
-- MIGRATION: 00028_release_10a_schema
-- Purpose: Task Execution 2.0 (Start Date, Watchers, Activity Triggers)
-- ------------------------------------------------------------------------------

-- 1. ADD START DATE TO TASKS
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;


-- 2. CREATE TASK WATCHERS TABLE
CREATE TABLE IF NOT EXISTS public.task_watchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Workspace members can view task watchers" ON public.task_watchers
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.tasks t
                JOIN public.projects p ON t.project_id = p.id
                JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
                WHERE t.id = task_watchers.task_id
                AND wm.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Workspace members can insert task watchers" ON public.task_watchers
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.tasks t
                JOIN public.projects p ON t.project_id = p.id
                JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
                WHERE t.id = task_watchers.task_id
                AND wm.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Workspace members can delete task watchers" ON public.task_watchers
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM public.tasks t
                JOIN public.projects p ON t.project_id = p.id
                JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
                WHERE t.id = task_watchers.task_id
                AND wm.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 3. ACTIVITY TIMELINE TRIGGERS (Structured Logging)
CREATE OR REPLACE FUNCTION public.handle_task_activity_logging()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_actor_id UUID;
BEGIN
  -- We don't want system updates to flood the logs, check if actor exists
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace_id INTO v_workspace_id FROM public.projects WHERE id = NEW.project_id;

  -- Status Change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (v_workspace_id, v_actor_id, 'task', NEW.id, 'status_changed', 
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'task_title', NEW.title));
  END IF;

  -- Priority Change
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (v_workspace_id, v_actor_id, 'task', NEW.id, 'priority_changed', 
            jsonb_build_object('old_priority', OLD.priority, 'new_priority', NEW.priority, 'task_title', NEW.title));
  END IF;

  -- Assignee Change
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
      VALUES (v_workspace_id, v_actor_id, 'task', NEW.id, 'assigned', 
              jsonb_build_object('new_assignee_id', NEW.assignee_id, 'task_title', NEW.title));
    ELSE
      INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
      VALUES (v_workspace_id, v_actor_id, 'task', NEW.id, 'unassigned', 
              jsonb_build_object('old_assignee_id', OLD.assignee_id, 'task_title', NEW.title));
    END IF;
  END IF;

  -- Due Date Change
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (v_workspace_id, v_actor_id, 'task', NEW.id, 'due_date_changed', 
            jsonb_build_object('old_date', OLD.due_date, 'new_date', NEW.due_date, 'task_title', NEW.title));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_task_activity_logging ON public.tasks;
CREATE TRIGGER trigger_task_activity_logging
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_activity_logging();
