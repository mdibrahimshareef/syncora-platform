-- ------------------------------------------------------------------------------
-- MIGRATION: 00053_release15_time_tracking
-- Purpose: Time Tracking, Timesheets, Capacity, Budgets, Cost Tracking
-- ------------------------------------------------------------------------------

-- 1. TIME ENTRIES
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 0 NOT NULL,
    billable BOOLEAN DEFAULT false NOT NULL,
    status TEXT DEFAULT 'DRAFT' NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    timesheet_id UUID, -- References timesheets(id) added later
    source TEXT DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'TIMER', 'AUTOMATION', 'API')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT duration_positive CHECK (duration_minutes >= 0)
);

CREATE INDEX idx_time_entries_workspace ON public.time_entries(workspace_id);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_started_at ON public.time_entries(started_at);

-- No updated_at triggers required, managed via API

-- 2. TIMESHEETS
CREATE TABLE IF NOT EXISTS public.timesheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'DRAFT' NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    review_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_period CHECK (period_end >= period_start),
    UNIQUE(workspace_id, user_id, period_start)
);

CREATE INDEX idx_timesheets_workspace ON public.timesheets(workspace_id);
CREATE INDEX idx_timesheets_user ON public.timesheets(user_id);
CREATE INDEX idx_timesheets_status ON public.timesheets(status);

-- No updated_at triggers required, managed via API

-- Add foreign key from time_entries to timesheets
ALTER TABLE public.time_entries 
    ADD CONSTRAINT fk_time_entries_timesheet 
    FOREIGN KEY (timesheet_id) REFERENCES public.timesheets(id) ON DELETE SET NULL;

-- 3. PROJECT BUDGETS
CREATE TABLE IF NOT EXISTS public.project_budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    budget_type TEXT DEFAULT 'TIME' CHECK (budget_type IN ('TIME', 'COST', 'TIME_AND_COST')),
    budget_minutes INTEGER DEFAULT 0 NOT NULL,
    budget_amount NUMERIC(15, 2) DEFAULT 0,
    warning_threshold INTEGER DEFAULT 75, -- Percentage
    critical_threshold INTEGER DEFAULT 90, -- Percentage
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(project_id)
);

CREATE INDEX idx_project_budgets_workspace ON public.project_budgets(workspace_id);

-- No updated_at triggers required, managed via API

-- 4. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

-- Time Entries Policies
DO $$ BEGIN
    CREATE POLICY "Workspace owners and admins can view all time entries" ON public.time_entries
        FOR SELECT USING (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = time_entries.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can view their own time entries" ON public.time_entries
        FOR SELECT USING (
            user_id = auth.uid() AND is_workspace_member(workspace_id)
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can view time entries for accessible projects" ON public.time_entries
        FOR SELECT USING (
            project_id IS NOT NULL AND 
            EXISTS (
                SELECT 1 FROM public.projects p
                JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
                WHERE p.id = time_entries.project_id AND wm.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can create their own time entries" ON public.time_entries
        FOR INSERT WITH CHECK (
            user_id = auth.uid() AND is_workspace_member(workspace_id)
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can update their own draft/rejected time entries" ON public.time_entries
        FOR UPDATE USING (
            user_id = auth.uid() AND is_workspace_member(workspace_id) AND status IN ('DRAFT', 'REJECTED')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can update all time entries" ON public.time_entries
        FOR UPDATE USING (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = time_entries.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can delete their own draft/rejected time entries" ON public.time_entries
        FOR DELETE USING (
            user_id = auth.uid() AND is_workspace_member(workspace_id) AND status IN ('DRAFT', 'REJECTED')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can delete time entries" ON public.time_entries
        FOR DELETE USING (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = time_entries.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Timesheets Policies
DO $$ BEGIN
    CREATE POLICY "Workspace owners and admins can view all timesheets" ON public.timesheets
        FOR SELECT USING (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = timesheets.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can view their own timesheets" ON public.timesheets
        FOR SELECT USING (
            user_id = auth.uid() AND is_workspace_member(workspace_id)
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can create their own timesheets" ON public.timesheets
        FOR INSERT WITH CHECK (
            user_id = auth.uid() AND is_workspace_member(workspace_id)
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can update their own draft/rejected timesheets" ON public.timesheets
        FOR UPDATE USING (
            user_id = auth.uid() AND is_workspace_member(workspace_id) AND status IN ('DRAFT', 'REJECTED')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can update all timesheets" ON public.timesheets
        FOR UPDATE USING (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = timesheets.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Members can delete their own draft/rejected timesheets" ON public.timesheets
        FOR DELETE USING (
            user_id = auth.uid() AND is_workspace_member(workspace_id) AND status IN ('DRAFT', 'REJECTED')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Project Budgets Policies
DO $$ BEGIN
    CREATE POLICY "Workspace members can view accessible project budgets" ON public.project_budgets
        FOR SELECT USING (
            is_workspace_member(workspace_id) AND 
            EXISTS (
                SELECT 1 FROM public.projects p
                JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
                WHERE p.id = project_budgets.project_id AND wm.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins and Owners can insert project budgets" ON public.project_budgets
        FOR INSERT WITH CHECK (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = project_budgets.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins and Owners can update project budgets" ON public.project_budgets
        FOR UPDATE USING (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = project_budgets.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins and Owners can delete project budgets" ON public.project_budgets
        FOR DELETE USING (
            is_workspace_admin_or_owner(workspace_id) OR
            EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = project_budgets.workspace_id AND user_id = auth.uid() AND role = 'owner')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
