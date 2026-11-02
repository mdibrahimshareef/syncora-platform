-- Migration: 00065_fix_organizations_update_policy
-- Purpose: Fix the RLS policy for updating organizations.
-- 
-- In 00010_organizations_teams.sql, the policy was:
--   CREATE POLICY "Admins/Owners can update organizations" ON public.organizations FOR UPDATE USING (
--     EXISTS (
--       SELECT 1 FROM public.organization_members 
--       WHERE org_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );
-- Because 'id' was unqualified, PostgreSQL shadowed 'organizations.id' with 'organization_members.id'.
-- This evaluated as 'organization_members.org_id = organization_members.id', which was always FALSE,
-- preventing any user (even owners and admins) from updating the organization and causing PostgREST
-- to fail with "Cannot coerce the result to a single JSON object" (PGRST116).
--
-- This migration fixes the policy by properly qualifying organizations.id, allowing owner_id = auth.uid(),
-- and leveraging the is_org_admin security definer function.

DROP POLICY IF EXISTS "Admins/Owners can update organizations" ON public.organizations;

CREATE POLICY "Admins/Owners can update organizations" ON public.organizations
FOR UPDATE
USING (
  owner_id = auth.uid() 
  OR public.is_org_admin(id)
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = organizations.id 
    AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR public.is_org_admin(id)
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = organizations.id 
    AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin')
  )
);

