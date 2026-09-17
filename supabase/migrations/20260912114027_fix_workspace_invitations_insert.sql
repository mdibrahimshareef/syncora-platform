-- Drop the old policy that used the helper function
DROP POLICY IF EXISTS "Admins can create workspace invitations" ON public.workspace_invitations;

-- Create a new policy using an inline EXISTS check
CREATE POLICY "Admins can create workspace invitations" ON public.workspace_invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = public.workspace_invitations.workspace_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);
