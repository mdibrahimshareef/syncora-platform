-- Add metadata column to profiles for extended user information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
