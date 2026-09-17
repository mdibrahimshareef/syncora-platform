-- ------------------------------------------------------------------------------
-- MIGRATION: 00024_case_insensitive_invites
-- Purpose: 
-- 1. Update accept_invitation, accept_organization_invitation and accept_team_invitation
--    to compare emails case-insensitively using LOWER()
-- ------------------------------------------------------------------------------

-- 1. Fix accept_invitation (Workspace)
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

  IF LOWER(v_invitation.email) != LOWER(v_user_email) THEN
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

  -- Mark invitation as accepted
  UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN v_invitation.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Fix accept_organization_invitation
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invitation_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the user's email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Get and lock invitation
  SELECT * INTO v_invitation FROM public.organization_invitations 
  WHERE token = invitation_token AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already accepted';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;

  IF LOWER(v_invitation.email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address.';
  END IF;

  -- Insert member
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_invitation.org_id, v_user_id, v_invitation.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Update invitation
  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN v_invitation.org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Fix accept_team_invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the user's email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_invitation FROM public.team_invitations 
  WHERE token = invitation_token AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already processed invitation';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.team_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;

  IF LOWER(v_invitation.email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address.';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invitation.team_id, v_user_id, v_invitation.role)
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.team_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN v_invitation.team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
