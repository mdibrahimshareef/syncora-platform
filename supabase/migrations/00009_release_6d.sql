-- 1. Create Storage Bucket for Attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Workspace members can upload attachments" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'attachments' AND 
  (EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = (string_to_array(name, '/'))[1]::uuid 
    AND user_id = auth.uid()
  ))
);

CREATE POLICY "Workspace members can view attachments" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'attachments' AND 
  (EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = (string_to_array(name, '/'))[1]::uuid 
    AND user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete their own attachments" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'attachments' AND 
  owner = auth.uid()
);

-- 2. Task Attachments Table
CREATE TABLE public.task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for task_attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task attachments" ON public.task_attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = task_attachments.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Members can insert task attachments" ON public.task_attachments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own attachments metadata" ON public.task_attachments
  FOR DELETE USING (uploaded_by = auth.uid());

-- 3. Recurrence Columns for Tasks
ALTER TABLE public.tasks 
ADD COLUMN recurrence_rule TEXT,
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN next_occurrence TIMESTAMP WITH TIME ZONE,
ADD COLUMN recurring_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 4. DB Trigger for Auto-spawning recurring tasks when completed
CREATE OR REPLACE FUNCTION spawn_recurring_task()
RETURNS TRIGGER AS $$
DECLARE
  new_due_date TIMESTAMP WITH TIME ZONE;
  interval_str TEXT;
BEGIN
  -- Only trigger if status changed to 'Done' and it has a recurrence rule
  IF NEW.status = 'Done' AND OLD.status != 'Done' AND NEW.recurrence_rule IS NOT NULL THEN
    
    -- Calculate next due date
    IF NEW.recurrence_rule = 'daily' THEN
      interval_str := '1 day';
    ELSIF NEW.recurrence_rule = 'weekly' THEN
      interval_str := '1 week';
    ELSIF NEW.recurrence_rule = 'monthly' THEN
      interval_str := '1 month';
    ELSE
      -- Fallback or unhandled rules
      RETURN NEW;
    END IF;

    new_due_date := COALESCE(NEW.due_date, now()) + interval_str::interval;

    -- Insert the clone
    INSERT INTO public.tasks (
      title, description, status, priority, project_id, 
      assignee_id, position, due_date, parent_id, 
      recurrence_rule, is_recurring, recurring_parent_id,
      created_at, updated_at
    ) VALUES (
      NEW.title, NEW.description, 'Todo', NEW.priority, NEW.project_id, 
      NEW.assignee_id, NEW.position, new_due_date, NEW.parent_id, 
      NEW.recurrence_rule, true, COALESCE(NEW.recurring_parent_id, NEW.id),
      now(), now()
    );
    
    -- We could clear the recurrence rule on the completed parent, but it's better to keep it for history.
    -- To prevent infinite loops or double triggers, we'll leave it as is since the trigger only fires ON status change to 'Done'.
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completed_spawn_recurring
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION spawn_recurring_task();
