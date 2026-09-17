-- Create workspace_invitations table
CREATE TABLE public.workspace_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days') NOT NULL,
  UNIQUE(workspace_id, email)
);

CREATE INDEX idx_workspace_invitations_workspace_id ON public.workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_email ON public.workspace_invitations(email);

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invitations Policies
-- 1. Admins and owners can manage invitations in their workspaces
CREATE POLICY "Admins can view workspace invitations" ON public.workspace_invitations FOR SELECT USING (
  public.is_workspace_admin_or_owner(workspace_id)
);
CREATE POLICY "Admins can create workspace invitations" ON public.workspace_invitations FOR INSERT WITH CHECK (
  public.is_workspace_admin_or_owner(workspace_id)
);
CREATE POLICY "Admins can update workspace invitations" ON public.workspace_invitations FOR UPDATE USING (
  public.is_workspace_admin_or_owner(workspace_id)
);
CREATE POLICY "Admins can delete workspace invitations" ON public.workspace_invitations FOR DELETE USING (
  public.is_workspace_admin_or_owner(workspace_id)
);

-- 2. Users can view invitations sent to their email
CREATE POLICY "Users can view invitations to their email" ON public.workspace_invitations FOR SELECT USING (
  email = auth.jwt()->>'email'
);

-- 3. Unauthenticated or authenticated users can view an invitation by token (needed for the join page)
CREATE POLICY "Anyone can view invitation by token" ON public.workspace_invitations FOR SELECT USING (
  status = 'pending' AND expires_at > now()
);

-- RPC for accepting an invitation securely
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the user's email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Find the invitation
  SELECT * INTO v_invitation FROM public.workspace_invitations 
  WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already accepted';
  END IF;

  IF v_invitation.email != v_user_email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address.';
  END IF;

  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = v_invitation.workspace_id AND user_id = v_user_id) THEN
    -- They are already a member. Just mark the invitation accepted.
    UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = v_invitation.id;
    RETURN v_invitation.workspace_id;
  END IF;

  -- Insert the user into workspace_members
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_invitation.workspace_id, v_user_id, v_invitation.role);

  -- Update the invitation status
  UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  -- Create an activity record
  INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_invitation.workspace_id, 
    v_user_id, 
    'member', 
    v_user_id, 
    'joined', 
    jsonb_build_object('role', v_invitation.role, 'method', 'invitation')
  );

  RETURN v_invitation.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Workspace Members Policies to be more secure
DROP POLICY IF EXISTS "Users can insert themselves" ON public.workspace_members;

-- Allow users to insert themselves as owner of a new workspace (used during workspace creation flow)
CREATE POLICY "Users can insert themselves as owner of new workspace" ON public.workspace_members FOR INSERT WITH CHECK (
  user_id = auth.uid() AND role = 'owner' AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id
  )
);

-- Admins/owners can update or remove members
CREATE POLICY "Admins can update members" ON public.workspace_members FOR UPDATE USING (
  public.is_workspace_admin_or_owner(workspace_id)
);
CREATE POLICY "Admins can delete members" ON public.workspace_members FOR DELETE USING (
  public.is_workspace_admin_or_owner(workspace_id) OR user_id = auth.uid() -- users can leave
);
