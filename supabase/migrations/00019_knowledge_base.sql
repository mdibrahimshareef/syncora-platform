-- Create Documents table
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    parent_doc_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    emoji_icon TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Document Policies
-- A user can view documents in their workspace
CREATE POLICY "Users can view documents in their workspaces" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = documents.workspace_id
            AND user_id = auth.uid()
        )
    );

-- A user can create documents in their workspace
CREATE POLICY "Users can create documents in their workspaces" ON public.documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = documents.workspace_id
            AND user_id = auth.uid()
        )
    );

-- A user can update documents in their workspace
CREATE POLICY "Users can update documents in their workspaces" ON public.documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = documents.workspace_id
            AND user_id = auth.uid()
        )
    );

-- A user can delete documents in their workspace
CREATE POLICY "Users can delete documents in their workspaces" ON public.documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = documents.workspace_id
        )
    );

-- Attach audit trigger to documents
CREATE TRIGGER audit_documents_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
