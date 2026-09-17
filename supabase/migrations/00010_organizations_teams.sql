-- Create organizations table
CREATE TABLE public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create organization_members table
CREATE TABLE public.organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(org_id, user_id)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(org_id, slug)
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Add columns to workspaces
ALTER TABLE public.workspaces 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Helper function to check if user is in org
CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = org_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is in team
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = team_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations
CREATE POLICY "Users can view their organizations" ON public.organizations FOR SELECT USING (
  public.is_org_member(id) OR owner_id = auth.uid()
);
CREATE POLICY "Users can create organizations" ON public.organizations FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins/Owners can update organizations" ON public.organizations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE org_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Organization Members
CREATE POLICY "Users can view members of their organizations" ON public.organization_members FOR SELECT USING (
  public.is_org_member(org_id)
);
CREATE POLICY "Admins/Owners can manage org members" ON public.organization_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE org_id = public.organization_members.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Teams
CREATE POLICY "Users can view teams in their organizations" ON public.teams FOR SELECT USING (
  public.is_org_member(org_id)
);
CREATE POLICY "Org Admins/Owners can manage teams" ON public.teams FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE org_id = public.teams.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Team Members
CREATE POLICY "Users can view team members in their organizations" ON public.team_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.teams WHERE id = public.team_members.team_id AND public.is_org_member(org_id)
  )
);
CREATE POLICY "Team leads or org admins can manage team members" ON public.team_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teams WHERE id = public.team_members.team_id AND (
      EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = public.teams.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
      OR
      EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = public.team_members.team_id AND tm.user_id = auth.uid() AND tm.role = 'lead')
    )
  )
);

-- Update workspace RLS to allow org members to view workspaces if they are public to org? 
-- For now, preserve existing workspace privacy: only workspace members can view. We don't change workspace policies here except maybe creating a default team.

-- Safe Data Backfill
DO $$
DECLARE
    ws_record RECORD;
    org_id UUID;
    team_id UUID;
BEGIN
    FOR ws_record IN SELECT * FROM public.workspaces LOOP
        -- 1. Create an Organization for each workspace
        INSERT INTO public.organizations (name, slug, owner_id)
        VALUES (ws_record.name || ' Org', ws_record.slug || '-org', ws_record.created_by)
        RETURNING id INTO org_id;

        -- 2. Add members to the organization
        IF ws_record.created_by IS NOT NULL THEN
            INSERT INTO public.organization_members (org_id, user_id, role)
            VALUES (org_id, ws_record.created_by, 'owner')
            ON CONFLICT (org_id, user_id) DO NOTHING;
        END IF;

        INSERT INTO public.organization_members (org_id, user_id, role)
        SELECT org_id, user_id, CASE WHEN role = 'owner' THEN 'owner' WHEN role = 'admin' THEN 'admin' ELSE 'member' END 
        FROM public.workspace_members WHERE workspace_id = ws_record.id
        ON CONFLICT (org_id, user_id) DO NOTHING;

        -- 3. Create a default "General" team for the organization
        INSERT INTO public.teams (org_id, name, slug, description)
        VALUES (org_id, 'General', 'general', 'Default team for ' || ws_record.name)
        RETURNING id INTO team_id;

        -- 4. Add members to the team
        INSERT INTO public.team_members (team_id, user_id, role)
        SELECT team_id, user_id, CASE WHEN role IN ('owner', 'admin') THEN 'lead' ELSE 'member' END
        FROM public.workspace_members WHERE workspace_id = ws_record.id
        ON CONFLICT (team_id, user_id) DO NOTHING;

        -- 5. Link workspace to the org and team
        UPDATE public.workspaces 
        SET organization_id = org_id, team_id = team_id 
        WHERE id = ws_record.id;
        
    END LOOP;
END;
$$;

-- Finally, enforce organization_id as NOT NULL
ALTER TABLE public.workspaces ALTER COLUMN organization_id SET NOT NULL;
