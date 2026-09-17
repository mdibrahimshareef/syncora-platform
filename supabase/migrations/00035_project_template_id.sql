-- Add template_id to projects table
ALTER TABLE public.projects 
ADD COLUMN template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL;
