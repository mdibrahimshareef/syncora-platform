-- 1. Drop existing constraints on statuses and priorities to allow for dynamic domains
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all check constraints on tasks.status
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'tasks'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%') LOOP
        EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    -- Drop all check constraints on tasks.priority
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'tasks'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%priority%') LOOP
        EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    -- Drop all check constraints on projects.status
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'projects'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%') LOOP
        EXECUTE 'ALTER TABLE projects DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;


-- 2. Create project_statuses table
CREATE TABLE public.project_statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'gray',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, name)
);

ALTER TABLE public.project_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view project statuses" ON public.project_statuses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE p.id = project_statuses.project_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace admins can insert project statuses" ON public.project_statuses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE p.id = project_statuses.project_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace admins can update project statuses" ON public.project_statuses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE p.id = project_statuses.project_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace admins can delete project statuses" ON public.project_statuses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE p.id = project_statuses.project_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );


-- 3. Create custom_field_definitions table
CREATE TABLE public.custom_field_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- if null, it's a workspace-wide field
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'select', 'multi-select')),
    options JSONB, -- For select/multi-select
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view custom fields" ON public.custom_field_definitions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm 
            WHERE wm.workspace_id = custom_field_definitions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace admins can manage custom fields" ON public.custom_field_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm 
            WHERE wm.workspace_id = custom_field_definitions.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );


-- 4. Create task_custom_fields table
CREATE TABLE public.task_custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    field_id UUID REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(task_id, field_id)
);

ALTER TABLE public.task_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view task custom fields" ON public.task_custom_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE t.id = task_custom_fields.task_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can manage task custom fields" ON public.task_custom_fields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE t.id = task_custom_fields.task_id
            AND wm.user_id = auth.uid()
        )
    );


-- 5. Create templates table
CREATE TABLE public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT NOT NULL, -- e.g., 'marketing', 'engineering'
    category TEXT NOT NULL, -- e.g., 'project', 'task'
    content JSONB NOT NULL, -- The structure defining statuses, fields, and tasks
    is_global BOOLEAN DEFAULT false, -- True if it's a built-in DOKI template
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- For custom templates created by users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view global templates, members can view their workspace's custom templates
CREATE POLICY "Users can view templates" ON public.templates
    FOR SELECT USING (
        is_global = true OR
        EXISTS (
            SELECT 1 FROM public.workspace_members wm 
            WHERE wm.workspace_id = templates.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace admins can manage custom templates" ON public.templates
    FOR ALL USING (
        is_global = false AND
        EXISTS (
            SELECT 1 FROM public.workspace_members wm 
            WHERE wm.workspace_id = templates.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );


-- 6. Backfill existing projects with standard statuses
INSERT INTO public.project_statuses (project_id, name, color, position)
SELECT p.id, s.name, s.color, s.position
FROM public.projects p
CROSS JOIN (
    VALUES 
        ('Backlog', 'gray', 0),
        ('Todo', 'blue', 1),
        ('In Progress', 'yellow', 2),
        ('Review', 'purple', 3),
        ('Done', 'green', 4)
) AS s(name, color, position)
ON CONFLICT (project_id, name) DO NOTHING;
