-- Phase 10B: Project Planning & Team Execution 2.0 Schema
-- Create milestones table
CREATE TABLE public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones in their workspaces" ON public.milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = milestones.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage milestones in their workspaces" ON public.milestones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = milestones.workspace_id
            AND user_id = auth.uid()
        )
    );

-- Link Tasks to Milestones
ALTER TABLE public.tasks ADD COLUMN milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL;

-- Create Saved Filters table
CREATE TABLE public.saved_filters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    filter_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved filters" ON public.saved_filters
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own saved filters" ON public.saved_filters
    FOR ALL USING (user_id = auth.uid());


-- Create Automations tables
CREATE TABLE public.automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB,
    action_type TEXT NOT NULL,
    action_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automations in their workspaces" ON public.automations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = automations.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage automations" ON public.automations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = automations.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE TABLE public.automation_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Success', 'Failed')),
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation runs in their workspaces" ON public.automation_runs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = automation_runs.workspace_id
            AND user_id = auth.uid()
        )
    );

-- No updated_at triggers required, managed via API or not strictly enforced via trigger

