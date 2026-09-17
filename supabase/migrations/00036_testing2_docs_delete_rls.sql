-- Fix documents delete RLS policy
DROP POLICY IF EXISTS "Users can delete documents in their workspaces" ON public.documents;
CREATE POLICY "Users can delete documents in their workspaces" ON public.documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = documents.workspace_id
            AND user_id = auth.uid()
        )
    );
