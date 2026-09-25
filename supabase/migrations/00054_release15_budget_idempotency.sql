-- ==========================================
-- SYNCORA RELEASE 15
-- MIGRATION: 00054_release15_budget_idempotency
-- ==========================================

-- Add threshold event tracking columns to project_budgets
ALTER TABLE public.project_budgets 
ADD COLUMN IF NOT EXISTS warning_dispatched boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS critical_dispatched boolean DEFAULT false;

-- Create an index to quickly find active timers for a user
CREATE INDEX IF NOT EXISTS idx_time_entries_active 
ON public.time_entries (user_id) 
WHERE ended_at IS NULL;
