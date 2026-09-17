-- ------------------------------------------------------------------------------
-- MIGRATION: 00022_fix_org_team_member_insert_policy
-- Purpose: Allow users to insert themselves as owner/lead during onboarding
-- ------------------------------------------------------------------------------

-- Fix the RLS policy for organization_members insert during onboarding
DROP POLICY IF EXISTS "Users can insert themselves as owner of new org" ON public.organization_members;
CREATE POLICY "Users can insert themselves as owner of new org" ON public.organization_members FOR INSERT WITH CHECK (
  user_id = auth.uid() AND role = 'owner' AND EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()
  )
);

-- Fix the RLS policy for team_members insert during onboarding
DROP POLICY IF EXISTS "Users can insert themselves as lead of team" ON public.team_members;
CREATE POLICY "Users can insert themselves as lead of team" ON public.team_members FOR INSERT WITH CHECK (
  user_id = auth.uid() AND role = 'lead' AND EXISTS (
    SELECT 1 FROM public.organization_members om 
    JOIN public.teams t ON t.org_id = om.org_id
    WHERE t.id = team_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  )
);
