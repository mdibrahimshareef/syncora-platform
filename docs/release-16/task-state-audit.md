# Syncora Release 16: Task State Audit

## 1. Authoritative Task State
The authoritative source of truth for all tasks is the Supabase PostgreSQL `tasks` table. Modifications via API routes/helpers map UI camelCase concepts to snake_case schema definitions. Re-fetching or real-time broadcasts overwrite derived and local copies to ensure consistency with the backend.

## 2. Derived Task State
Projects hold derived data such as `taskCount` and `progress`. These are either computed on the client via selector maps or hydrated through Supabase view integrations during large data fetches.

## 3. Local Component Copies
Zustand's `useDataStore` maintains the global client-side task state inside two main arrays:
- `tasks`: Currently populated based on `projectId`.
- `workspaceTasks`: Sourced from `getWorkspaceTasks` for the `activeWorkspaceId`.
Components (e.g., `TaskDetailsPanel`, Kanban, List, My Work) act as readers of these arrays. Local "copies" within the components are generally ephemeral (`useMemo`) representations. Form states (like `TaskForm`) utilize `react-hook-form` to track uncommitted edits.

## 4. Optimistic Mutations
`createTask`, `updateTask`, `deleteTask`, `bulkUpdateTasks`, and `bulkDeleteTasks` apply immediate UI changes by modifying the `tasks` and `workspaceTasks` arrays inside `useDataStore`. 
For instance, `updateTask` applies `.map()` over both arrays to inject `...updates` instantly before calling `fetch('/api/tasks/${id}', { method: 'PUT' })`.

## 5. Server Reconciliation
- `createTask` maps the temporary local ID to the backend-assigned UUID upon successful API resolution.
- `updateTask` resolves silently without forcibly rewriting the optimistic JSON tree unless a full workspace re-fetch happens or a realtime broadcast forces it.

## 6. Realtime Reconciliation
`applyRealtimeTaskInsert`, `applyRealtimeTaskUpdate`, and `applyRealtimeTaskDelete` serve as realtime receivers. 
- Updates undergo deduplication (`new Date(payload.updated_at).getTime() <= new Date(existing.updatedAt).getTime()`) so older server messages don't overwrite fresh client state.
- Inserts undergo deduplication by checking `state.tasks.some(t => t.id === payload.id)`.

## 7. Rollback Mechanisms
- Explicit rollbacks are implemented on `createTask` (deletes temp ID on catch), `deleteTask` (restores original arrays on catch), and `bulkDeleteTasks`.
- `updateTask` currently **does not** explicitly rollback state on a failed `fetch`, as noted by the inline comment: `// Rollback not implemented strictly here for brevity, but should reset to original`. This represents a risk where UI might display successful state despite a DB failure.

## 8. Possible Duplicate Task Sources
Components often select tasks by checking both `tasks` and `workspaceTasks` (e.g. `workspaceTasks.find(t => t.id === selectedTaskId) || tasks.find(...)`). Given there are two arrays representing tasks in different contexts, drift is possible if they aren't kept fully symmetric. Currently, Zustand setters modify both simultaneously.

## 9. Workspace Filtering
Realtime receivers explicitly check bounds:
`if (payload.workspace_id && payload.workspace_id !== state.activeWorkspaceId) return state;`
This successfully prevents Task A in Workspace A from leaking into Workspace B if both receive the event on the same websocket.

## 10. Project Filtering
Component views filter the top-level `workspaceTasks` array by `projectId` directly inside `useMemo` hooks (e.g., `workspaceTasks.filter(t => t.projectId === task.projectId)`). The state itself remains workspace-wide.

## 11. Stale Async Request Risks
If a user rapidly transitions contexts or if overlapping fetches (`fetchWorkspaceTasks` vs `fetchTasks`) resolve out-of-order, optimistic mutations that just occurred could be clobbered by stale payload returns. However, the use of `activeWorkspaceId` boundary checks inside async resolution blocks heavily mitigates bleeding risks between context switches.
