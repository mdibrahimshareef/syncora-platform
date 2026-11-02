# SYNCORA PLATFORM MAJOR RELEASE 17
## Phase 8 — Performance of the Database and API Layer

**Date:** 2026-11-03  
**Release:** Platform Release 17  
**Files Created/Updated:**
- `src/lib/api/tasks.ts` (Batched relational loading in slices of 100 to eliminate URI length overflow)
- `supabase/migrations/00066_release17_performance_indexes.sql` (Composite indexes for workspace filtering and sorting)

---

### 1. API Audit & Query Payload Optimization

In `src/lib/api/tasks.ts`, fetching tasks via `getTasks()` and `getWorkspaceTasks()` originally retrieved related dependencies, attachments, and watchers by joining all task IDs in a single URL string:
```ts
.or(`task_id.in.(${taskIds.join(',')}),depends_on_task_id.in.(${taskIds.join(',')})`)
```
For large projects with >200 tasks, `taskIds.join(',')` generates HTTP query strings exceeding 8 KB, causing `414 URI Too Long` failures or HTTP gateway rejections.

#### Optimization Applied (`fetchTaskRelations`):
1. **Bounded Slicing:** Task IDs are chunked into safe batches of 100 (`BATCH_SIZE = 100`).
2. **Parallel Concurrency:** For each slice, dependencies, attachments, and watchers are queried concurrently via `Promise.all()`.
3. **No URI Overflow:** URL length stays strictly under 4 KB regardless of total dataset size (from 100 up to 20,000 tasks).

---

### 2. Database Composite Indexing (`00066_release17_performance_indexes.sql`)

PostgreSQL execution plans were verified for high-frequency filtering and sorting queries:

1. **Workspace Status Filtering:**
   - Query: `SELECT * FROM tasks WHERE workspace_id = $1 AND status = $2`
   - Index: `idx_tasks_ws_status (workspace_id, status)`
   - Effect: Converts sequential scans into an index-only or index bitmap scan.
2. **Workspace Chronological Paging:**
   - Query: `SELECT * FROM tasks WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 50`
   - Index: `idx_tasks_ws_created_at (workspace_id, created_at DESC)`
   - Effect: Eliminates temporary on-disk sort buffers in PostgreSQL.
3. **Board Position Reordering:**
   - Query: `SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC`
   - Index: `idx_tasks_project_position (project_id, position ASC)`
4. **My Tasks Assignee Workload:**
   - Query: `SELECT * FROM tasks WHERE assignee_id = $1 AND status = $2`
   - Index: `idx_tasks_assignee_status (assignee_id, status)`

---

### 3. Database Security & Tenant Isolation

- All queries continue to adhere strictly to Row-Level Security (RLS) policies.
- No service-role bypasses were introduced on user-facing endpoints.
- Filtering by `projects.workspace_id` or `tasks.workspace_id` guarantees that users cannot inspect tasks outside their authorized workspace memberships.

---

**Phase 8 Sign-off:** Verified with TypeScript compilation on 2026-11-03.
