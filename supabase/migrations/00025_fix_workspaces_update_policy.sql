DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;

CREATE POLICY "Owners can update workspaces" ON public.workspaces FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND role = 'owner'
  )
);
