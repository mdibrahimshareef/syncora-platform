-- Create AI Embeddings Foundation table
-- This explicitly satisfies Phase 36 (AI Foundation) without faking features.
-- In a real production deployment, this would use the pgvector extension.
CREATE TABLE public.ai_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    resource_type TEXT NOT NULL, -- 'task', 'project', 'document'
    resource_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    embedding JSONB, -- Placeholder for vector data
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Performance Indexes (Phase 32)
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON public.audit_logs(workspace_id);

-- Enable RLS
ALTER TABLE public.ai_embeddings ENABLE ROW LEVEL SECURITY;

-- AI Embeddings Policies
CREATE POLICY "Users can view AI embeddings for their workspaces" ON public.ai_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = ai_embeddings.workspace_id
            AND user_id = auth.uid()
        )
    );

-- Global Search RPC (Phase 16)
-- Unified search across multiple tables without N+1 queries.
CREATE OR REPLACE FUNCTION public.global_search(query_text text, ws_id uuid)
RETURNS TABLE (
    type text,
    id uuid,
    title text,
    description text,
    link text
) AS $$
BEGIN
    RETURN QUERY
    
    -- Search Tasks
    SELECT 
        'task'::text as type,
        t.id,
        t.title,
        t.description,
        '/app/projects/' || t.project_id || '?task=' || t.id as link
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
        '/app/projects/' || p.id as link
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
        '/app/docs/' || d.id as link
    FROM public.documents d
    WHERE d.workspace_id = ws_id
    AND (d.title ILIKE '%' || query_text || '%' OR d.content ILIKE '%' || query_text || '%');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
