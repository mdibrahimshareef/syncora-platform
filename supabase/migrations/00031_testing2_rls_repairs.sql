-- SYNCORA TESTING 2: RLS Repairs

CREATE POLICY "Users can insert automation runs in their workspaces" ON public.automation_runs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = automation_runs.workspace_id
            AND user_id = auth.uid()
        )
    );
