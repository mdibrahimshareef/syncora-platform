-- ------------------------------------------------------------------------------
-- MIGRATION: 00021_collaboration_notifications
-- Purpose: Move notification generation from insecure client calls to DB triggers.
-- ------------------------------------------------------------------------------

-- 1. Tighten RLS on notifications (Drop client-side insert)
DROP POLICY IF EXISTS "Users can insert notifications for workspace members" ON public.notifications;

-- We don't recreate an INSERT policy. Only the database triggers (running as superuser via SECURITY DEFINER)
-- or backend service roles can create notifications now.

-- ------------------------------------------------------------------------------
-- 2. TRIGGER FUNCTION: Task Assignments
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_task_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_actor_id UUID;
BEGIN
  -- We only care if assignee_id actually changed and isn't null (unassignments don't spam)
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL THEN
    
    -- Actor is whoever made the request, or null if system
    v_actor_id := auth.uid();

    -- Do not notify the user if they assigned the task to themselves
    IF NEW.assignee_id != COALESCE(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      
      -- Get workspace_id from project
      SELECT workspace_id INTO v_workspace_id FROM public.projects WHERE id = NEW.project_id;

      INSERT INTO public.notifications (
        workspace_id,
        recipient_id,
        actor_id,
        type,
        entity_type,
        entity_id,
        metadata
      ) VALUES (
        v_workspace_id,
        NEW.assignee_id,
        v_actor_id,
        'TASK_ASSIGNED',
        'task',
        NEW.id,
        jsonb_build_object('task_title', NEW.title, 'project_id', NEW.project_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_task_assignment_notification ON public.tasks;
CREATE TRIGGER trigger_task_assignment_notification
  AFTER UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_assignment_notification();


-- ------------------------------------------------------------------------------
-- 3. TRIGGER FUNCTION: Task Status Change
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_task_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_actor_id UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    
    v_actor_id := auth.uid();

    -- Notify the assignee if someone else changed the status
    IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != COALESCE(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      
      SELECT workspace_id INTO v_workspace_id FROM public.projects WHERE id = NEW.project_id;

      INSERT INTO public.notifications (
        workspace_id,
        recipient_id,
        actor_id,
        type,
        entity_type,
        entity_id,
        metadata
      ) VALUES (
        v_workspace_id,
        NEW.assignee_id,
        v_actor_id,
        'TASK_STATUS_CHANGED',
        'task',
        NEW.id,
        jsonb_build_object('task_title', NEW.title, 'old_status', OLD.status, 'new_status', NEW.status, 'project_id', NEW.project_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_task_status_notification ON public.tasks;
CREATE TRIGGER trigger_task_status_notification
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_status_notification();


-- ------------------------------------------------------------------------------
-- 4. TRIGGER FUNCTION: Comment Added
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_assignee_id UUID;
  v_task_title TEXT;
  v_project_id UUID;
BEGIN
  -- Get the task details
  SELECT assignee_id, title, project_id INTO v_assignee_id, v_task_title, v_project_id
  FROM public.tasks 
  WHERE id = NEW.task_id;

  -- If the task is assigned, and the commenter is NOT the assignee
  IF v_assignee_id IS NOT NULL AND v_assignee_id != NEW.author_id THEN
    
    INSERT INTO public.notifications (
      workspace_id,
      recipient_id,
      actor_id,
      type,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      NEW.workspace_id,
      v_assignee_id,
      NEW.author_id,
      'COMMENT_ADDED',
      'task',
      NEW.task_id, -- Link to the task
      jsonb_build_object('task_title', v_task_title, 'comment_id', NEW.id, 'project_id', v_project_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_comment_notification ON public.comments;
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_notification();
