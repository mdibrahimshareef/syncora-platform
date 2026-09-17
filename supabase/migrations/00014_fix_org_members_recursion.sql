-- Drop the recursively defined policy on organization_members
DROP POLICY IF EXISTS "Admins/Owners can manage org members" ON public.organization_members;

-- Create a SECURITY DEFINER function to evaluate org admin status without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.is_org_admin(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- First check if the user is the direct owner of the organization
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id = org_uuid AND owner_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  
  -- Then check if the user is an owner/admin in the members table
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = org_uuid
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the policy using the security definer function
CREATE POLICY "Admins/Owners can manage org members" ON public.organization_members FOR ALL USING (
  public.is_org_admin(org_id)
);
