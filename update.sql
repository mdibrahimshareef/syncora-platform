DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;
CREATE POLICY "Workspace members can view projects" ON public.projects FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);
