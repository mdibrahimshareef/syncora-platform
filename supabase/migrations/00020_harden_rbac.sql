-- ==============================================================================
-- DOKI SECURITY HARDENING: RBAC PRIVILEGE ESCALATION PREVENTION
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN WORKSPACE MEMBERS RLS
-- ------------------------------------------------------------------------------

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.workspace_members;

-- Prevent Admins from targeting Owners, and prevent granting the Owner role unless you are an Owner
CREATE POLICY "Admins can update members" ON public.workspace_members FOR UPDATE USING (
  -- Actor must be admin or owner
  public.is_workspace_admin_or_owner(workspace_id)
  AND
  -- If targeting an existing owner, actor MUST be an owner
  (
    role != 'owner' 
    OR 
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
  )
) WITH CHECK (
  -- If assigning the owner role, actor MUST be an owner
  (
    role != 'owner' 
    OR 
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
  )
);

-- Prevent Admins from removing Owners
CREATE POLICY "Admins can delete members" ON public.workspace_members FOR DELETE USING (
  (
    public.is_workspace_admin_or_owner(workspace_id)
    AND
    -- If targeting an existing owner, actor MUST be an owner
    (
      role != 'owner' 
      OR 
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner')
    )
  )
  OR user_id = auth.uid() -- Users can always leave voluntarily
);

-- ------------------------------------------------------------------------------
-- 2. HARDEN ORGANIZATION MEMBERS RLS
-- ------------------------------------------------------------------------------

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Admins/Owners can manage org members" ON public.organization_members;

-- Admins/Owners can Insert
CREATE POLICY "Admins/Owners can insert org members" ON public.organization_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE org_id = public.organization_members.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  AND
  (
    role != 'owner' 
    OR 
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = public.organization_members.org_id AND om.user_id = auth.uid() AND om.role = 'owner')
  )
);

-- Admins/Owners can Update (with owner protection)
CREATE POLICY "Admins/Owners can update org members" ON public.organization_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE org_id = public.organization_members.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  AND
  (
    role != 'owner' 
    OR 
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = public.organization_members.org_id AND om.user_id = auth.uid() AND om.role = 'owner')
  )
) WITH CHECK (
  (
    role != 'owner' 
    OR 
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = public.organization_members.org_id AND om.user_id = auth.uid() AND om.role = 'owner')
  )
);

-- Admins/Owners can Delete (with owner protection)
CREATE POLICY "Admins/Owners can delete org members" ON public.organization_members FOR DELETE USING (
  (
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE org_id = public.organization_members.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    AND
    (
      role != 'owner' 
      OR 
      EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = public.organization_members.org_id AND om.user_id = auth.uid() AND om.role = 'owner')
    )
  )
  OR user_id = auth.uid()
);

-- ------------------------------------------------------------------------------
-- 3. HARDEN PROJECTS RLS
-- ------------------------------------------------------------------------------

-- Drop the permissive policy that allows ANY member to delete a project
DROP POLICY IF EXISTS "Workspace members can delete projects" ON public.projects;

-- Only Admins and Owners can delete projects
CREATE POLICY "Admins/Owners can delete projects" ON public.projects FOR DELETE USING (
  public.is_workspace_admin_or_owner(workspace_id)
);
