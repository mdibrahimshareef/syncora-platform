-- SYNCORA Release 17: Large-Data Composite Performance Indexes
-- Accelerates workspace-scoped filtering, sorting, pagination, and My Tasks queries.

-- 1. Composite index for workspace-level status filtering (e.g. workspace task list, Kanban hydration)
CREATE INDEX IF NOT EXISTS idx_tasks_ws_status ON public.tasks(workspace_id, status);

-- 2. Composite index for workspace-level chronological sorting and cursor pagination
CREATE INDEX IF NOT EXISTS idx_tasks_ws_created_at ON public.tasks(workspace_id, created_at DESC);

-- 3. Composite index for project-level task reordering and board column sorting
CREATE INDEX IF NOT EXISTS idx_tasks_project_position ON public.tasks(project_id, position ASC);

-- 4. Composite index for My Tasks assignee workload and status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks(assignee_id, status);

-- 5. Composite index for due date sorting and calendar queries
CREATE INDEX IF NOT EXISTS idx_tasks_ws_due_date ON public.tasks(workspace_id, due_date) WHERE due_date IS NOT NULL;

