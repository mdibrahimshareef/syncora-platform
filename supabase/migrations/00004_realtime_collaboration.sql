-- Create comments table
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_comments_task_id ON public.comments(task_id);
CREATE INDEX idx_comments_workspace_id ON public.comments(workspace_id);
CREATE INDEX idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_workspace_id ON public.notifications(workspace_id);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Comments Policies
CREATE POLICY "Users can view comments in their workspaces" ON public.comments FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Users can insert comments in their workspaces" ON public.comments FOR INSERT WITH CHECK (
  public.is_workspace_member(workspace_id) AND author_id = auth.uid()
);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (
  author_id = auth.uid()
);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (
  author_id = auth.uid()
);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (
  recipient_id = auth.uid()
);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (
  recipient_id = auth.uid()
);
CREATE POLICY "Users can insert notifications for workspace members" ON public.notifications FOR INSERT WITH CHECK (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (
  recipient_id = auth.uid()
);

-- Configure Supabase Realtime
-- Drop the publication if it exists and recreate it for safety, or just alter it.
-- By default, Supabase creates 'supabase_realtime' publication.
-- We add the tables we want to track in realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
