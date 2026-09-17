-- 00040_phase11c_search.sql
-- Phase 11C: Universal Command Palette (Search Extension)

DROP FUNCTION IF EXISTS public.global_search(text, uuid);

CREATE OR REPLACE FUNCTION public.global_search(query_text text, ws_id uuid)
RETURNS TABLE (
    type text,
    id uuid,
    title text,
    description text,
    link text,
    project_id uuid
) AS $$
BEGIN
    RETURN QUERY
    
    -- Search Tasks
    SELECT 
        'task'::text as type,
        t.id,
        t.title,
        t.description,
        '/projects/' || t.project_id || '?task=' || t.id as link,
        t.project_id as project_id
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE p.workspace_id = ws_id
    AND (t.title ILIKE '%' || query_text || '%' OR t.description ILIKE '%' || query_text || '%')
    
    UNION ALL
    
    -- Search Projects
    SELECT 
        'project'::text as type,
        p.id,
        p.name as title,
        p.description,
        '/projects/' || p.id as link,
        NULL::uuid as project_id
    FROM public.projects p
    WHERE p.workspace_id = ws_id
    AND (p.name ILIKE '%' || query_text || '%' OR p.description ILIKE '%' || query_text || '%')
    
    UNION ALL
    
    -- Search Documents
    SELECT 
        'document'::text as type,
        d.id,
        d.title,
        d.content as description,
        '/docs/' || d.id as link,
        NULL::uuid as project_id
    FROM public.documents d
    WHERE d.workspace_id = ws_id
    AND (d.title ILIKE '%' || query_text || '%' OR d.content ILIKE '%' || query_text || '%')
    
    UNION ALL

    -- Search Users (Workspace Members)
    SELECT
        'user'::text as type,
        pr.id,
        pr.full_name as title,
        pr.email as description,
        '/workload?user=' || pr.id as link,
        NULL::uuid as project_id
    FROM public.workspace_members wm
    JOIN public.profiles pr ON pr.id = wm.user_id
    WHERE wm.workspace_id = ws_id
    AND (pr.full_name ILIKE '%' || query_text || '%' OR pr.email ILIKE '%' || query_text || '%');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
