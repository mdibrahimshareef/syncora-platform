-- Create organization_invitations table
CREATE TABLE public.organization_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days') NOT NULL,
  UNIQUE(org_id, email)
);

CREATE INDEX idx_organization_invitations_org_id ON public.organization_invitations(org_id);
CREATE INDEX idx_organization_invitations_token ON public.organization_invitations(token);
CREATE INDEX idx_organization_invitations_email ON public.organization_invitations(email);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Invitations Policies for Organizations
CREATE POLICY "Admins can view org invitations" ON public.organization_invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = public.organization_invitations.org_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);
CREATE POLICY "Admins can create org invitations" ON public.organization_invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = public.organization_invitations.org_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);
CREATE POLICY "Admins can update org invitations" ON public.organization_invitations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = public.organization_invitations.org_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);
CREATE POLICY "Admins can delete org invitations" ON public.organization_invitations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = public.organization_invitations.org_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can view org invitations to their email" ON public.organization_invitations FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Anyone can view org invitation by token" ON public.organization_invitations FOR SELECT USING (
  true
);

-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days') NOT NULL,
  UNIQUE(team_id, email)
);

CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Invitations Policies for Teams
CREATE POLICY "Leads can view team invitations" ON public.team_invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = public.team_invitations.team_id
    AND user_id = auth.uid()
    AND role IN ('lead')
  )
);
CREATE POLICY "Leads can create team invitations" ON public.team_invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = public.team_invitations.team_id
    AND user_id = auth.uid()
    AND role IN ('lead')
  )
);
CREATE POLICY "Leads can update team invitations" ON public.team_invitations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = public.team_invitations.team_id
    AND user_id = auth.uid()
    AND role IN ('lead')
  )
);
CREATE POLICY "Leads can delete team invitations" ON public.team_invitations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = public.team_invitations.team_id
    AND user_id = auth.uid()
    AND role IN ('lead')
  )
);

CREATE POLICY "Users can view team invitations to their email" ON public.team_invitations FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Anyone can view team invitation by token" ON public.team_invitations FOR SELECT USING (
  true
);

-- Accept Organization Invitation Function
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invitation_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  -- Get user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get and lock invitation
  SELECT * INTO v_invitation FROM public.organization_invitations 
  WHERE token = invitation_token AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already processed invitation';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation expired';
  END IF;

  -- Insert member
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_invitation.org_id, v_user_id, v_invitation.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Update invitation
  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept Team Invitation Function
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invitation.team_id, v_user_id, v_invitation.role)
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.team_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
