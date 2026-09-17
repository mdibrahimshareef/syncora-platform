-- Phase 11H: Templates 3.0 (Task Types)

-- Add task_types JSONB array to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS task_types JSONB DEFAULT '["Task"]'::jsonb;
