-- Fix the RLS policy for workspace_members insert

DROP POLICY IF EXISTS "Users can insert themselves as owner of new workspace" ON public.workspace_members;

CREATE POLICY "Users can insert themselves as owner of new workspace" ON public.workspace_members FOR INSERT WITH CHECK (
  user_id = auth.uid() AND role = 'owner' AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()
  )
);
