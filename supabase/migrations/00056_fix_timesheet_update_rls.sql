-- Drop the old policy
DROP POLICY IF EXISTS "Members can update their own draft/rejected timesheets" ON public.timesheets;

-- Recreate it with an explicit WITH CHECK clause to allow changing the status to SUBMITTED
DO $$ BEGIN
    CREATE POLICY "Members can update their own draft/rejected timesheets" ON public.timesheets
        FOR UPDATE USING (
            user_id = auth.uid() AND is_workspace_member(workspace_id) AND status IN ('DRAFT', 'REJECTED')
        ) WITH CHECK (
            user_id = auth.uid() AND is_workspace_member(workspace_id) AND status IN ('DRAFT', 'SUBMITTED')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
