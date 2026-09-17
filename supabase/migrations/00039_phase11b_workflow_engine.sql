-- 00039_phase11b_workflow_engine.sql
-- Phase 11B: Workflow Engine 2.0

-- Extend project_statuses with category, default flag, and allowed transitions
ALTER TABLE public.project_statuses
ADD COLUMN category TEXT DEFAULT 'Todo' CHECK (category IN ('Todo', 'In Progress', 'Done', 'Cancelled')),
ADD COLUMN is_default BOOLEAN DEFAULT false,
ADD COLUMN allowed_transitions JSONB DEFAULT '[]'::jsonb;

-- Update existing statuses to guess categories based on name
UPDATE public.project_statuses
SET category = 'Todo' WHERE name ILIKE '%backlog%' OR name ILIKE '%todo%' OR name ILIKE '%to do%';

UPDATE public.project_statuses
SET category = 'In Progress' WHERE name ILIKE '%progress%' OR name ILIKE '%review%' OR name ILIKE '%testing%';

UPDATE public.project_statuses
SET category = 'Done' WHERE name ILIKE '%done%' OR name ILIKE '%complete%';

UPDATE public.project_statuses
SET category = 'Cancelled' WHERE name ILIKE '%cancel%';
