-- 00041_phase11d_my_work.sql
-- Phase 11D: My Work 2.0 Workload and Capacity

ALTER TABLE public.tasks
ADD COLUMN estimated_hours NUMERIC DEFAULT 0,
ADD COLUMN story_points NUMERIC DEFAULT 0;
