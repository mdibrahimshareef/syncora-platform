-- Create Request Forms table
CREATE TABLE public.request_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    fields_schema JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Requests table
CREATE TABLE public.requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES public.request_forms(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'New' NOT NULL,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Approvals table
CREATE TABLE public.approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    resource_type TEXT NOT NULL, -- 'task', 'document', 'request'
    resource_id UUID NOT NULL,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    approver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.request_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Request Forms Policies
CREATE POLICY "Users can view request forms in their workspaces" ON public.request_forms
    FOR SELECT USING (
        is_public = true OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = request_forms.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage request forms in their workspaces" ON public.request_forms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = request_forms.workspace_id
            AND user_id = auth.uid()
        )
    );

-- Requests Policies
CREATE POLICY "Users can view requests in their workspaces" ON public.requests
    FOR SELECT USING (
        requester_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = requests.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create requests" ON public.requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.request_forms
            WHERE id = requests.form_id
            AND (is_public = true OR EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = request_forms.workspace_id
                AND user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can update requests in their workspaces" ON public.requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = requests.workspace_id
            AND user_id = auth.uid()
        )
    );

-- Approvals Policies
CREATE POLICY "Users can view approvals in their workspaces" ON public.approvals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = approvals.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage approvals in their workspaces" ON public.approvals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = approvals.workspace_id
            AND user_id = auth.uid()
        )
    );
