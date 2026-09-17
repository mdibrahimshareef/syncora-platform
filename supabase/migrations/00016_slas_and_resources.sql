-- Alter Projects table
ALTER TABLE public.projects 
ADD COLUMN budget NUMERIC DEFAULT 0,
ADD COLUMN spent NUMERIC DEFAULT 0,
ADD COLUMN currency TEXT DEFAULT 'USD',
ADD COLUMN health TEXT DEFAULT 'On Track';

-- Alter Tasks table
ALTER TABLE public.tasks
ADD COLUMN sla_priority TEXT,
ADD COLUMN sla_severity TEXT,
ADD COLUMN response_target TIMESTAMP WITH TIME ZONE,
ADD COLUMN resolution_target TIMESTAMP WITH TIME ZONE,
ADD COLUMN sla_status TEXT, -- 'On Track', 'At Risk', 'Breached'
ADD COLUMN estimated_time INTEGER DEFAULT 0, -- minutes
ADD COLUMN tracked_time INTEGER DEFAULT 0, -- minutes
ADD COLUMN estimated_cost NUMERIC DEFAULT 0,
ADD COLUMN actual_cost NUMERIC DEFAULT 0;

-- Create Customers table
CREATE TABLE public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT,
    contact_email TEXT,
    tier TEXT DEFAULT 'Standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Customer Requests table
CREATE TABLE public.customer_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;

-- Customers Policies
CREATE POLICY "Users can view customers in their workspaces" ON public.customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = customers.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage customers in their workspaces" ON public.customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = customers.workspace_id
            AND user_id = auth.uid()
        )
    );

-- Customer Requests Policies
CREATE POLICY "Users can view customer requests in their workspaces" ON public.customer_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = customer_requests.workspace_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage customer requests in their workspaces" ON public.customer_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = customer_requests.workspace_id
            AND user_id = auth.uid()
        )
    );
