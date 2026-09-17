-- Fix audit logs trigger for cascade deletes
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
        IF TG_OP = 'DELETE' THEN
            workspace_id_val := OLD.workspace_id;
        ELSE
            workspace_id_val := NEW.workspace_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'tasks' THEN
        -- Need to fetch workspace_id from project
        IF TG_OP = 'DELETE' THEN
            SELECT workspace_id INTO workspace_id_val FROM public.projects WHERE id = OLD.project_id;
        ELSE
            SELECT workspace_id INTO workspace_id_val FROM public.projects WHERE id = NEW.project_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'documents' THEN
        IF TG_OP = 'DELETE' THEN
            workspace_id_val := OLD.workspace_id;
        ELSE
            workspace_id_val := NEW.workspace_id;
        END IF;
    END IF;

    -- If workspace_id is null (e.g., parent project was already deleted in a cascade), skip audit logging
    IF workspace_id_val IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
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
