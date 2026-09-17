-- Fix realtime publication to include missing tables like milestones
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
