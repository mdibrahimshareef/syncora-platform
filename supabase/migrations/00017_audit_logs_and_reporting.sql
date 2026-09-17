-- Create Audit Logs table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit Logs Policies (Read-Only for workspace members, though typically this would be admins only)
-- For simplicity in Phase 8, we allow workspace members to view it, but no one can insert/update/delete.
CREATE POLICY "Users can view audit logs in their workspaces" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = audit_logs.workspace_id
            AND user_id = auth.uid()
        )
    );

-- Audit Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    workspace_id_val UUID;
BEGIN
    -- Get current user (if called via Supabase PostgREST)
    current_user_id := auth.uid();
    
    -- Determine workspace_id based on the table
    IF TG_TABLE_NAME = 'projects' THEN
        workspace_id_val := NEW.workspace_id;
        IF TG_OP = 'DELETE' THEN
            workspace_id_val := OLD.workspace_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'tasks' THEN
        -- Need to fetch workspace_id from project
        IF TG_OP = 'DELETE' THEN
            SELECT workspace_id INTO workspace_id_val FROM public.projects WHERE id = OLD.project_id;
        ELSE
            SELECT workspace_id INTO workspace_id_val FROM public.projects WHERE id = NEW.project_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'documents' THEN
        workspace_id_val := NEW.workspace_id;
        IF TG_OP = 'DELETE' THEN
            workspace_id_val := OLD.workspace_id;
        END IF;
    END IF;

    -- Insert audit log
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (workspace_id, actor_id, action, resource_type, resource_id, metadata)
        VALUES (workspace_id_val, current_user_id, TG_TABLE_NAME || '.created', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (workspace_id, actor_id, action, resource_type, resource_id, metadata)
        VALUES (workspace_id_val, current_user_id, TG_TABLE_NAME || '.updated', TG_TABLE_NAME, NEW.id, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (workspace_id, actor_id, action, resource_type, resource_id, metadata)
        VALUES (workspace_id_val, current_user_id, TG_TABLE_NAME || '.deleted', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to relevant tables
CREATE TRIGGER audit_projects_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_tasks_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();


