-- Drop the recursively defined policy on team_members
DROP POLICY IF EXISTS "Team leads or org admins can manage team members" ON public.team_members;

-- Create a SECURITY DEFINER function to evaluate team lead status without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.is_team_lead(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = check_team_id
    AND user_id = auth.uid()
    AND role = 'lead'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policy using SECURITY DEFINER functions is_org_admin and is_team_lead
CREATE POLICY "Team leads or org admins can manage team members" ON public.team_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teams WHERE id = public.team_members.team_id AND (
      public.is_org_admin(org_id)
      OR
      public.is_team_lead(public.teams.id)
    )
  )
);
