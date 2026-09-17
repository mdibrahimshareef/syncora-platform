-- Add parent_id to tasks for subtasks
ALTER TABLE public.tasks ADD COLUMN parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_id);

-- Create task_dependencies table
CREATE TABLE public.task_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'blocking' CHECK (type IN ('blocking', 'related', 'duplicate')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Workspace members can view task dependencies
CREATE POLICY "Workspace members can view task dependencies" ON public.task_dependencies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_dependencies.task_id AND public.is_workspace_member(projects.workspace_id)
  )
);

CREATE POLICY "Workspace members can insert task dependencies" ON public.task_dependencies FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_dependencies.task_id AND public.is_workspace_member(projects.workspace_id)
  )
);

CREATE POLICY "Workspace members can delete task dependencies" ON public.task_dependencies FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_dependencies.task_id AND public.is_workspace_member(projects.workspace_id)
  )
);
