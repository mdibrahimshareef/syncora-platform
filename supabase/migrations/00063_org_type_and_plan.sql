-- Migration 00063: Add type and plan columns to organizations
-- Supports Supabase-style organization onboarding and classification

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

-- Comment on columns for schema documentation
COMMENT ON COLUMN public.organizations.type IS 'Organization type: personal, educational, startup, agency, company, n/a';
COMMENT ON COLUMN public.organizations.plan IS 'Organization subscription plan: free, pro, team, enterprise';
