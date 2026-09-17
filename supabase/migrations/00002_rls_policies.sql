-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is in workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view profiles of users in the same workspace, and update their own.
-- For simplicity, let's allow users to view any profile and update their own.
CREATE POLICY "Users can view any profile" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces
CREATE POLICY "Users can view their workspaces" ON public.workspaces FOR SELECT USING (
  public.is_workspace_member(id) OR created_by = auth.uid()
);
CREATE POLICY "Users can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Owners can update workspaces" ON public.workspaces FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = id AND user_id = auth.uid() AND role = 'owner'
  )
);

-- Workspace Members
CREATE POLICY "Users can view members of their workspaces" ON public.workspace_members FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
-- Using SECURITY DEFINER function to bypass RLS for inserts if needed, or simply let the trigger/RPC handle inserts.
-- For now, allow inserts if the user is inserting themselves (e.g. creating a workspace)
CREATE POLICY "Users can insert themselves" ON public.workspace_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Projects
CREATE POLICY "Workspace members can view projects" ON public.projects FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Workspace members can insert projects" ON public.projects FOR INSERT WITH CHECK (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Workspace members can update projects" ON public.projects FOR UPDATE USING (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Workspace members can delete projects" ON public.projects FOR DELETE USING (
  public.is_workspace_member(workspace_id)
);

-- Tasks
CREATE POLICY "Workspace members can view tasks" ON public.tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id AND public.is_workspace_member(projects.workspace_id)
  )
);
CREATE POLICY "Workspace members can insert tasks" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id AND public.is_workspace_member(projects.workspace_id)
  )
);
CREATE POLICY "Workspace members can update tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id AND public.is_workspace_member(projects.workspace_id)
  )
);
CREATE POLICY "Workspace members can delete tasks" ON public.tasks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id AND public.is_workspace_member(projects.workspace_id)
  )
);

-- Labels
CREATE POLICY "Workspace members can view labels" ON public.labels FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Workspace members can insert labels" ON public.labels FOR INSERT WITH CHECK (
  public.is_workspace_member(workspace_id)
);

-- Task Labels
CREATE POLICY "Workspace members can view task labels" ON public.task_labels FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_labels.task_id AND public.is_workspace_member(projects.workspace_id)
  )
);
CREATE POLICY "Workspace members can insert task labels" ON public.task_labels FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_labels.task_id AND public.is_workspace_member(projects.workspace_id)
  )
);
CREATE POLICY "Workspace members can delete task labels" ON public.task_labels FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_labels.task_id AND public.is_workspace_member(projects.workspace_id)
  )
);

-- Activities
CREATE POLICY "Workspace members can view activities" ON public.activities FOR SELECT USING (
  public.is_workspace_member(workspace_id)
);
CREATE POLICY "Workspace members can insert activities" ON public.activities FOR INSERT WITH CHECK (
  public.is_workspace_member(workspace_id)
);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
