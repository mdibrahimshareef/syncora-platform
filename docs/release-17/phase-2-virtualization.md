# SYNCORA PLATFORM MAJOR RELEASE 17
## Phase 2 — Large-Data Rendering Architecture & Virtualization

**Date:** 2026-11-03  
**Release:** Platform Release 17  
**Installed Packages:** `@tanstack/react-virtual` 3.14.25  
**Files Modified/Created:**
- `src/components/tasks/TaskListView.tsx` (Production TanStack virtualized list)
- `src/components/tasks/TaskColumn.tsx` (CSS containment & isolated layout boundaries)
- `src/components/tasks/TaskCard.tsx` (Memoized card with fine-grained subtask selector)
- `supabase/migrations/00066_release17_performance_indexes.sql` (Composite database indexes)
- `tests/virtualized_task_list.test.ts` (Large-data virtualization validation)

---

### 1. Major Collection Audit

The following high-volume collections across SYNCORA were audited for rendering performance:

| Collection | Typical Scale | Virtualization Strategy | Rationale |
|---|---|---|---|
| **Project Task Lists** | 100 – 20,000 tasks | `@tanstack/react-virtual` Windowing | High DOM density (18 nodes per row); unvirtualized rendering crashes with >1,000 tasks. |
| **Kanban Columns** | 20 – 500 tasks / col | CSS Layout Containment & Progressive Mount | Preserves `@dnd-kit` drag sensor coordinates, drop targets, and auto-scroll while isolating reflows. |
| **My Tasks View** | 50 – 2,000 tasks | Virtualized Task List | Reuses `TaskListView` with virtual windowing. |
| **Global Search Results** | 10 – 50 items | Bounded Result Sizing | Server-side `limit(50)` eliminates DOM overhead. |
| **Activity Feed / Audit** | 100 – 10,000 logs | Server Cursor Pagination | Offloads historic activity from client memory. |

---

### 2. Virtualized Task List Architecture (`TaskListView.tsx`)

A production-grade virtualized task list was built using `@tanstack/react-virtual`:

- **Dynamic Row Measurements:** `estimateSize: () => 52` with sticky table headers and relative container positioning.
- **Stable Identity:** Virtual rows map directly to `task.id` without index-based key recycling bugs.
- **DOM Footprint Reduction:**
  - 1,000 tasks: from 18,000 nodes down to $\sim 450$ nodes ($97.5\%$ reduction).
  - 20,000 tasks: from 360,000 nodes down to $\sim 450$ nodes ($99.87\%$ reduction).
- **Keyboard Ergonomics Built-in:**
  - `J` / `ArrowDown`: Moves selection cursor down with automatic `scrollToIndex(next, { align: 'auto' })`.
  - `K` / `ArrowUp`: Moves selection cursor up with auto-scroll.
  - `Enter`: Opens task details drawer in `useUIStore`.
  - `X`: Toggles selection checkbox for bulk operations.
  - Strict input suppression: Shortcuts do not trigger when typing in `input`, `textarea`, `contenteditable`, or modal overlays.
- **Component Memoization:** `TaskRowItem` is wrapped in `React.memo`, preventing unaffected rows from re-rendering when selection or adjacent tasks change.

---

### 3. Kanban Drag-and-Drop Integrity (`TaskColumn.tsx` & `TaskCard.tsx`)

Following the modern web guidance for `interactions-in-complex-layouts`:
- Applying raw DOM node detachment to Kanban columns during active dnd-kit interactions risks breaking collision detection and drop targets.
- Instead, **CSS layout containment** (`contain: 'layout style'`, `contentVisibility: 'auto'`, `containIntrinsicSize: 'auto 320px auto 700px'`) was applied to each column.
- This creates an isolation barrier: dragging a card in the "In Progress" column isolates browser style and layout recalculations to that specific column, preventing global reflows across the entire application shell.
- In `TaskCard.tsx`, broad store subscriptions (`s => s.tasks`) were replaced with fine-grained selectors and `React.memo`, eliminating unnecessary re-renders across all board cards.

---

### 4. Database Indexing Migration (`00066_release17_performance_indexes.sql`)

Composite indexes were introduced to optimize PostgreSQL execution plans:
1. `idx_tasks_ws_status`: Accelerates workspace task fetching and status filtering (`workspace_id, status`).
2. `idx_tasks_ws_created_at`: Optimizes chronological sorting and cursor pagination (`workspace_id, created_at DESC`).
3. `idx_tasks_project_position`: Accelerates project board ordering (`project_id, position ASC`).
4. `idx_tasks_assignee_status`: Optimizes My Tasks assignee filtering (`assignee_id, status`).
5. `idx_tasks_ws_due_date`: Accelerates calendar and due-date milestone queries (`workspace_id, due_date`).

---

**Phase 2 Sign-off:** Verified with TypeScript check (0 errors) and Vitest suite on 2026-11-03.

