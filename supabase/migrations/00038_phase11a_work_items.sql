-- 00038_phase11a_work_items.sql
-- Phase 11A - Universal Work Item Foundation

-- 1. Add workspace_id for stronger isolation and cross-project global searches
ALTER TABLE public.tasks
ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id from projects
UPDATE public.tasks t
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE t.project_id = p.id;

-- Make workspace_id NOT NULL for future inserts (optional but good practice)
-- We will just leave it as normal for now to prevent breaking existing API inserts that don't pass it yet,
-- but we will default to it being passed. Let's make it NOT NULL since project_id implies it, but we need API to pass it.
-- Actually, let's leave it nullable for a moment, or use a trigger to auto-populate if missing.
CREATE OR REPLACE FUNCTION set_task_workspace_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_id IS NULL AND NEW.project_id IS NOT NULL THEN
        SELECT workspace_id INTO NEW.workspace_id FROM public.projects WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_task_workspace_id
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION set_task_workspace_id();

-- Now make it NOT NULL to enforce it at the schema level safely
ALTER TABLE public.tasks
ALTER COLUMN workspace_id SET NOT NULL;

-- 2. Add work item fields
ALTER TABLE public.tasks
ADD COLUMN task_type TEXT DEFAULT 'Task',
ADD COLUMN reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
ADD COLUMN approval_id UUID REFERENCES public.approvals(id) ON DELETE SET NULL,
ADD COLUMN document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- 3. Create indexes for the new relations to prevent full table scans on cross-module queries
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON public.tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON public.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_request_id ON public.tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_id ON public.tasks(approval_id);
CREATE INDEX IF NOT EXISTS idx_tasks_document_id ON public.tasks(document_id);

-- 4. Update existing RLS policies to use workspace_id for faster isolation
-- We will preserve existing policies but we can add one for global workspace read if needed.
-- Currently, tasks policy might be based on projects.
