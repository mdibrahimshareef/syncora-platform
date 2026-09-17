
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
DECLARE
    v_org_id uuid;
BEGIN
    -- Get the org_id for the given workspace_id
    SELECT org_id INTO v_org_id FROM public.workspaces WHERE id = ws_id;

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
    AND (pr.full_name ILIKE '%' || query_text || '%' OR pr.email ILIKE '%' || query_text || '%')

    UNION ALL

    -- Search Customers
    SELECT
        'customer'::text as type,
        c.id,
        c.name as title,
        c.organization as description,
        '/customers/' || c.id as link,
        NULL::uuid as project_id
    FROM public.customers c
    WHERE c.workspace_id = ws_id
    AND (c.name ILIKE '%' || query_text || '%' OR c.organization ILIKE '%' || query_text || '%')

    UNION ALL

    -- Search Goals
    SELECT
        'goal'::text as type,
        g.id,
        g.name as title,
        g.description as description,
        '/goals/' || g.id as link,
        NULL::uuid as project_id
    FROM public.goals g
    WHERE g.org_id = v_org_id
    AND (g.name ILIKE '%' || query_text || '%' OR g.description ILIKE '%' || query_text || '%')

    UNION ALL

    -- Search Portfolios
    SELECT
        'portfolio'::text as type,
        po.id,
        po.name as title,
        po.description as description,
        '/portfolios/' || po.id as link,
        NULL::uuid as project_id
    FROM public.portfolios po
    WHERE po.org_id = v_org_id
    AND (po.name ILIKE '%' || query_text || '%' OR po.description ILIKE '%' || query_text || '%')

    UNION ALL

    -- Search Initiatives
    SELECT
        'initiative'::text as type,
        i.id,
        i.name as title,
        i.description as description,
        '/initiatives/' || i.id as link,
        NULL::uuid as project_id
    FROM public.initiatives i
    WHERE i.org_id = v_org_id
    AND (i.name ILIKE '%' || query_text || '%' OR i.description ILIKE '%' || query_text || '%');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

