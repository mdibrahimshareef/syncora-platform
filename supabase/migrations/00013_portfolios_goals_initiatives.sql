-- 1. Create Goals Table
CREATE TABLE public.goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'On Track' CHECK (status IN ('On Track', 'At Risk', 'Off Track', 'Completed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org goals" ON public.goals
    FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Admins can insert goals" ON public.goals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = goals.org_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update goals" ON public.goals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = goals.org_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete goals" ON public.goals
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = goals.org_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );


-- 2. Create Initiatives Table
CREATE TABLE public.initiatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    target_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Planning' CHECK (status IN ('Planning', 'Active', 'On Hold', 'Completed')),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org initiatives" ON public.initiatives
    FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Admins can manage initiatives" ON public.initiatives
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = initiatives.org_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );


-- 3. Create Portfolios Table
CREATE TABLE public.portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org portfolios" ON public.portfolios
    FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Admins can manage portfolios" ON public.portfolios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = portfolios.org_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );


-- 4. Alter Projects Table
ALTER TABLE public.projects 
ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
ADD COLUMN initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL;


-- 5. Create Portfolio Projects mapping table
CREATE TABLE public.portfolio_projects (
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (portfolio_id, project_id)
);

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view portfolio projects" ON public.portfolio_projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE id = portfolio_projects.portfolio_id
            AND public.is_org_member(org_id)
        )
    );

CREATE POLICY "Admins can manage portfolio projects" ON public.portfolio_projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE id = portfolio_projects.portfolio_id
            AND EXISTS (
                SELECT 1 FROM public.organization_members
                WHERE org_id = portfolios.org_id
                AND user_id = auth.uid()
                AND role IN ('owner', 'admin')
            )
        )
    );
