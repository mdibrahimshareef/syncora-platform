-- Restore original project policy
DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;
CREATE POLICY "Workspace members can view projects" ON public.projects FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
